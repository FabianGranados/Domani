-- ============================================================
-- DOMANI — Esquema base de datos (Supabase / PostgreSQL)
-- Versión MVP 1 — diseñado para escalar (10 -> 100.000+ usuarios)
-- ============================================================
--
-- PRINCIPIO LEGAL SUPREMO (no romper jamás):
--   1. Los Aurelios NUNCA se compran con dinero real en el MVP.
--      (existe el tipo 'purchased' en el ledger SOLO como reserva
--       futura, pero queda DESHABILITADO a nivel de aplicación).
--   2. Los Aurelios NUNCA se convierten a dinero / bienes / servicios reales.
--   3. NINGUNA tabla de juego contiene jamás un campo en pesos / dinero real.
--   4. El dinero real (cuando exista) solo compra MEMBRESÍA = poder de crear
--      torneos/mesas + estatus + estética. Nunca Aurelios ni ventaja de azar.
--   5. "Caja Azar" y "Caja Destreza": los Aurelios son una sola moneda de
--      fantasía, pero el dinero real nunca toca ninguna de las dos.
--
-- REGLA TÉCNICA SUPREMA:
--   Ningún saldo de Aurelios se modifica directamente.
--   TODO movimiento pasa por ledger_transactions (doble registro / auditable).
-- ============================================================

-- ----------  EXTENSIONES  ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. ENUMS
-- ============================================================
do $$ begin
  create type rank_tier as enum (
    'ciudadano_nuevo','ciudadano_activo','ciudadano_reconocido',
    'ciudadano_patricio','consigliere','don'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_tier as enum ('free','consigliere','don');
exception when duplicate_object then null; end $$;

-- Origen "contable" de los Aurelios (para auditoría interna).
-- 'purchased' existe pero NO se usa en el MVP (ver principio legal #1).
do $$ begin
  create type aureli_bucket as enum (
    'earned','promotional','invested','locked','purchased'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_reason as enum (
    'renta_ciudadana','academy_reward','game_win','game_loss','game_buyin',
    'tournament_buyin','tournament_prize','property_buy','property_sell',
    'property_rent','tax','maintenance','promo_grant','admin_adjust',
    'transfer_in_game'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_status as enum ('pending','confirmed','reversed');
exception when duplicate_object then null; end $$;

-- Familia de juego: define la naturaleza legal del juego.
--   'skill'  = destreza pura (ajedrez, damas, dominó, academia) -> SIN azar
--   'chance' = azar (póker, ruleta, blackjack, tragamonedas) -> solo fantasía
do $$ begin
  create type game_family as enum ('skill','chance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_session_status as enum ('open','running','finished','cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. USUARIOS / PERFIL / TESSERA
--    (auth.users lo gestiona Supabase Auth: correo + Google)
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  alias         text unique not null,
  is_bot        boolean not null default false,   -- jugadores IA del lobby
  age_confirmed boolean not null default false,   -- +18 confirmado
  rank          rank_tier not null default 'ciudadano_nuevo',
  membership    membership_tier not null default 'free',
  membership_expires_at timestamptz,
  influence     bigint not null default 0,        -- reputación (NO se apuesta)
  house_id      uuid,                              -- FK añadida abajo
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_house on profiles(house_id);
create index if not exists idx_profiles_is_bot on profiles(is_bot);

-- Tessera = credencial/identidad visual (datos derivados + cosméticos)
create table if not exists tesseras (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references profiles(id) on delete cascade,
  skin        text not null default 'base',       -- cosmético (lo compra membresía)
  joined_at   timestamptz not null default now(),
  reputation  int not null default 0
);

-- ============================================================
-- 3. CASAS / MEMBRESÍA DE CASA / RANGOS / INFLUENCIA
-- ============================================================
create table if not exists houses (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,             -- 'bacata','lexington',...
  name          text not null,
  city          text not null,
  motto         text,
  color_primary text,                              -- hex acento de la Casa
  specialty     text,
  created_at    timestamptz not null default now()
);

alter table profiles
  drop constraint if exists fk_profiles_house;
alter table profiles
  add constraint fk_profiles_house
  foreign key (house_id) references houses(id) on delete set null;

create table if not exists house_memberships (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles(id) on delete cascade,
  house_id  uuid not null references houses(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (user_id)                                 -- una Casa a la vez
);

-- Eventos de Influencia (reputación ganada por mérito, nunca por azar puro)
create table if not exists influence_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  amount     int not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. WALLET + LEDGER  (corazón económico — todo auditable)
-- ============================================================
-- wallets: un saldo "cacheado" por usuario (suma del ledger).
-- El saldo real es la suma del ledger; este campo es para lectura rápida
-- y se recalcula vía trigger en cada transacción confirmada.
create table if not exists wallets (
  user_id        uuid primary key references profiles(id) on delete cascade,
  balance        bigint not null default 0,        -- Aurelios totales (vista usuario)
  balance_earned bigint not null default 0,
  balance_promo  bigint not null default 0,
  balance_locked bigint not null default 0,
  updated_at     timestamptz not null default now(),
  constraint balance_non_negative check (balance >= 0)
);

-- ledger_transactions: fuente de verdad. Inmutable (no se hace UPDATE de montos).
create table if not exists ledger_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  amount      bigint not null,                     -- + ingreso / - egreso (Aurelios)
  bucket      aureli_bucket not null default 'earned',
  reason      ledger_reason not null,
  status      ledger_status not null default 'confirmed',
  ref_type    text,                                -- 'game_session','academy_attempt',...
  ref_id      uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ledger_user on ledger_transactions(user_id, created_at desc);
create index if not exists idx_ledger_ref  on ledger_transactions(ref_type, ref_id);

-- Trigger: al confirmar una transacción, actualiza el saldo cacheado.
create or replace function fn_apply_ledger() returns trigger as $$
begin
  if (new.status = 'confirmed') then
    insert into wallets(user_id, balance) values (new.user_id, 0)
      on conflict (user_id) do nothing;

    update wallets
      set balance = balance + new.amount,
          balance_earned = balance_earned + case when new.bucket='earned' then new.amount else 0 end,
          balance_promo  = balance_promo  + case when new.bucket='promotional' then new.amount else 0 end,
          balance_locked = balance_locked + case when new.bucket='locked' then new.amount else 0 end,
          updated_at = now()
    where user_id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_apply_ledger on ledger_transactions;
create trigger trg_apply_ledger
  after insert on ledger_transactions
  for each row execute function fn_apply_ledger();

-- ============================================================
-- 5. JUEGOS / SESIONES / TORNEOS
--    NOTA LEGAL: ninguna columna aquí maneja dinero real. Solo Aurelios.
-- ============================================================
create table if not exists games (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,                -- 'poker','chess','roulette',...
  name        text not null,
  family      game_family not null,                -- 'skill' | 'chance'
  min_players int not null default 1,
  max_players int not null default 1,
  is_active   boolean not null default true
);

-- Mesas / partidas / torneos creados (por el sistema o por miembros)
create table if not exists game_sessions (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id),
  host_user_id  uuid references profiles(id) on delete set null, -- null = sistema
  is_tournament boolean not null default false,
  is_private    boolean not null default false,    -- evento de invitados (círculo cerrado)
  buyin_aurelios bigint not null default 0,         -- entrada EN AURELIOS (jamás dinero)
  max_seats     int not null default 6,
  status        game_session_status not null default 'open',
  created_at    timestamptz not null default now(),
  constraint buyin_non_negative check (buyin_aurelios >= 0)
);

create index if not exists idx_sessions_game on game_sessions(game_id, status);
create index if not exists idx_sessions_host on game_sessions(host_user_id);

create table if not exists game_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references game_sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  seat        int,
  joined_at   timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists game_results (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references game_sessions(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  position      int,
  aurelios_delta bigint not null default 0,         -- ganancia/pérdida en Aurelios
  influence_delta int not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 6. LA ACADEMIA (conocimiento / destreza)
-- ============================================================
create table if not exists academy_questions (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  difficulty   text not null check (difficulty in ('facil','media','dificil','magistral')),
  prompt       text not null,
  options      jsonb not null,                      -- ["A...","B...","C...","D..."]
  correct_index int not null,
  reward_aurelios int not null,
  reward_influence int not null,
  is_active    boolean not null default true
);

create table if not exists academy_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  question_id  uuid not null references academy_questions(id),
  chosen_index int not null,
  is_correct   boolean not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_attempts_user on academy_attempts(user_id, created_at desc);

-- ============================================================
-- 7. RENTA CIUDADANA (asignación diaria con acción)
-- ============================================================
create table if not exists renta_claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  claim_date  date not null default current_date,
  amount      bigint not null,
  action      text not null,                        -- qué hizo para reclamarla
  created_at  timestamptz not null default now(),
  unique (user_id, claim_date)                      -- una vez por día
);

-- ============================================================
-- 8. PROPIEDADES / MERCADO  (Fase 2 — esquema base ya listo)
-- ============================================================
create table if not exists countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, name text not null
);
create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries(id),
  name text not null
);
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id),
  name text not null
);
create table if not exists property_templates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id),
  level int not null,
  kind text not null,
  base_price bigint not null,
  base_rent  bigint not null
);
create table if not exists property_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  template_id uuid not null references property_templates(id),
  bought_price bigint not null,
  in_arrears boolean not null default false,
  acquired_at timestamptz not null default now()
);

-- ============================================================
-- 9. AUDITORÍA / ANTIFRAUDE
-- ============================================================
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  flag text not null,
  detail jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
--     Cada usuario solo ve/edita lo suyo. Lectura pública de catálogos.
-- ============================================================
alter table profiles            enable row level security;
alter table tesseras            enable row level security;
alter table wallets             enable row level security;
alter table ledger_transactions enable row level security;
alter table academy_attempts    enable row level security;
alter table renta_claims        enable row level security;
alter table game_entries        enable row level security;
alter table game_results        enable row level security;
alter table property_holdings   enable row level security;
alter table house_memberships   enable row level security;
alter table influence_events    enable row level security;

-- Perfil: el usuario ve/edita el suyo; los perfiles (alias/casa) son públicos para lobby.
drop policy if exists p_profiles_read on profiles;
create policy p_profiles_read on profiles for select using (true);
drop policy if exists p_profiles_update on profiles;
create policy p_profiles_update on profiles for update using (auth.uid() = id);

-- Wallet: solo el dueño lo ve. Nadie lo modifica por API (solo el ledger vía service role).
drop policy if exists p_wallet_read on wallets;
create policy p_wallet_read on wallets for select using (auth.uid() = user_id);

-- Ledger: el usuario ve su historial; NUNCA puede insertar/editar (eso lo hace el backend con service_role).
drop policy if exists p_ledger_read on ledger_transactions;
create policy p_ledger_read on ledger_transactions for select using (auth.uid() = user_id);

-- Resto de tablas "propias": dueño lee lo suyo.
drop policy if exists p_tessera_read on tesseras;
create policy p_tessera_read on tesseras for select using (auth.uid() = user_id);
drop policy if exists p_attempts_read on academy_attempts;
create policy p_attempts_read on academy_attempts for select using (auth.uid() = user_id);
drop policy if exists p_renta_read on renta_claims;
create policy p_renta_read on renta_claims for select using (auth.uid() = user_id);
drop policy if exists p_holdings_read on property_holdings;
create policy p_holdings_read on property_holdings for select using (auth.uid() = user_id);
drop policy if exists p_house_mem_read on house_memberships;
create policy p_house_mem_read on house_memberships for select using (auth.uid() = user_id);
drop policy if exists p_influence_read on influence_events;
create policy p_influence_read on influence_events for select using (auth.uid() = user_id);
drop policy if exists p_entries_read on game_entries;
create policy p_entries_read on game_entries for select using (auth.uid() = user_id);
drop policy if exists p_results_read on game_results;
create policy p_results_read on game_results for select using (auth.uid() = user_id);

-- Catálogos públicos (lectura libre, escritura solo service_role / admin):
alter table houses enable row level security;
alter table games  enable row level security;
alter table academy_questions enable row level security;
drop policy if exists p_houses_read on houses;
create policy p_houses_read on houses for select using (true);
drop policy if exists p_games_read on games;
create policy p_games_read on games for select using (true);
drop policy if exists p_questions_read on academy_questions;
create policy p_questions_read on academy_questions for select using (is_active = true);

-- ============================================================
-- 11. SEED MÍNIMO (Casas + juegos base + 5 preguntas)
-- ============================================================
insert into houses (code, name, city, motto, color_primary, specialty) values
 ('bacata','Casa Bacatá','Bogotá','Desde la altura se ve todo.','#0F5C3F','ajedrez, estrategia, inmobiliaria'),
 ('lexington','Casa Lexington','Nueva York','En Lexington, el tiempo también juega.','#B87333','blackjack, mercado, torneos rápidos'),
 ('plata','Casa Plata','Buenos Aires','La jugada empieza antes de tocar la mesa.','#7B1E2B','póker, juegos mentales'),
 ('morro','Casa Morro Alto','Río de Janeiro','El Morro no pide permiso. El Morro sube.','#1F6F4A','dominó, cartas rápidas'),
 ('roma','Casa Roma','Roma','Roma no apuesta. Roma decide.','#C9A227','ruleta, póker, ajedrez'),
 ('osaka','Casa Osaka','Osaka','Un movimiento. Una consecuencia.','#8B0000','estrategia, precisión')
on conflict (code) do nothing;

insert into games (code, name, family, min_players, max_players) values
 ('chess','Ajedrez','skill',2,2),
 ('domino','Dominó','skill',2,4),
 ('checkers','Damas','skill',2,2),
 ('academy','La Academia','skill',1,1),
 ('poker','Póker','chance',2,9),
 ('roulette','Ruleta','chance',1,8),
 ('blackjack','Blackjack','chance',1,7),
 ('slots','Tragamonedas','chance',1,1)
on conflict (code) do nothing;

insert into academy_questions (category,difficulty,prompt,options,correct_index,reward_aurelios,reward_influence) values
 ('historia','facil','Napoleón fue emperador de:','["Alemania","Francia","Hungría","Suecia"]',1,20,1),
 ('geografia','facil','¿Cuál es la capital de Argentina?','["Córdoba","Rosario","Buenos Aires","Mendoza"]',2,20,1),
 ('ciencia','media','¿Qué planeta es conocido como el planeta rojo?','["Venus","Marte","Júpiter","Saturno"]',1,60,3),
 ('cultura','media','¿En qué país se originó el ajedrez moderno temprano?','["China","India","Egipto","Grecia"]',1,60,3),
 ('logica','dificil','Si 3 gatos cazan 3 ratones en 3 minutos, ¿cuántos gatos cazan 100 ratones en 100 minutos?','["3","100","33","300"]',0,150,8)
on conflict do nothing;

-- ============================================================
-- FIN DEL ESQUEMA MVP 1
-- ============================================================
