-- ============================================================
-- DOMANI — Mercado de Avatares
-- ============================================================
-- El rostro del ciudadano. Reglas:
--   - El alias nombra al avatar (no hay nombres de avatar): aquí solo
--     guardamos un ARQUETIPO interno para generación, nunca una persona real.
--   - El PRIMER avatar de pago es GRATIS (una sola vez). Los avatares de
--     precio 0 son siempre gratis. Cambiar a otro de pago cuesta Aurelios.
--   - Toda compra pasa por _credit_ledger (regla técnica suprema): jamás se
--     edita wallets.balance directamente desde el cliente.
-- ============================================================

-- Nueva razón de ledger para la compra cosmética de avatares.
alter type ledger_reason add value if not exists 'avatar_buy';

-- Catálogo de avatares (cosmético; NO toca el saldo por sí mismo).
create table if not exists avatars (
  code        text primary key,                    -- 'avatar-1', 'avatar-2', ...
  name        text not null,                        -- etiqueta de tienda (vitrina)
  archetype   text not null default 'ciudadano',    -- etiqueta interna de generación
  image_path  text not null,                        -- /assets/avatars/<code>.webp
  image_ready boolean not null default false,       -- ¿ya tiene arte real subido?
  price       bigint not null default 0 check (price >= 0),
  sort_order  int    not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Propiedad: qué avatares de pago ha adquirido cada ciudadano.
-- (Los de precio 0 son libres y NO generan fila aquí.)
create table if not exists profile_avatars (
  user_id     uuid not null references profiles(id) on delete cascade,
  avatar_code text not null references avatars(code) on delete cascade,
  price_paid  bigint not null default 0,
  acquired_at timestamptz not null default now(),
  primary key (user_id, avatar_code)
);
create index if not exists idx_profile_avatars_user on profile_avatars(user_id);

-- Avatar equipado actualmente (visible para los demás: póker, vitrina, etc.).
alter table profiles add column if not exists avatar_code text not null default 'avatar-1';

-- ============================================================
-- RLS
-- ============================================================
alter table avatars enable row level security;
alter table profile_avatars enable row level security;

drop policy if exists p_avatars_read on avatars;
create policy p_avatars_read on avatars for select using (is_active);

-- Cada quien ve qué avatares posee. (Solo lectura; la escritura va por RPC.)
drop policy if exists p_profile_avatars_read on profile_avatars;
create policy p_profile_avatars_read on profile_avatars for select using (auth.uid() = user_id);

-- ============================================================
-- RPC: set_avatar — equipar / adquirir (con primera-vez-gratis)
-- ============================================================
create or replace function set_avatar(p_code text)
returns table (avatar_code text, cost bigint, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_av        avatars;
  v_owned     boolean;
  v_used_free boolean;
  v_cost      bigint := 0;
  v_balance   bigint;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_av from avatars where code = p_code and is_active;
  if not found then
    raise exception 'avatar no disponible';
  end if;

  v_owned := exists (select 1 from profile_avatars pa where pa.user_id = v_uid and pa.avatar_code = p_code);

  if v_owned or v_av.price = 0 then
    v_cost := 0;                                   -- ya lo tiene, o es gratis
  else
    v_used_free := exists (select 1 from profile_avatars pa where pa.user_id = v_uid);
    if v_used_free then
      v_cost := v_av.price;                         -- ya gastó su primera vez → se paga
    else
      v_cost := 0;                                  -- primer avatar de pago: GRATIS
    end if;
  end if;

  if v_cost > 0 then
    select w.balance into v_balance from wallets w where w.user_id = v_uid;
    if coalesce(v_balance, 0) < v_cost then
      raise exception 'saldo insuficiente para este avatar';
    end if;
    perform _credit_ledger(
      v_uid, -v_cost, 'earned', 'avatar_buy',
      'avatar', null, jsonb_build_object('code', p_code)
    );
  end if;

  -- Registrar propiedad solo para avatares de pago (los gratis no hacen falta).
  if v_av.price > 0 and not v_owned then
    insert into profile_avatars(user_id, avatar_code, price_paid)
    values (v_uid, p_code, v_cost)
    on conflict do nothing;
  end if;

  update profiles set avatar_code = p_code, updated_at = now() where id = v_uid;

  return query
    select p_code, v_cost, w.balance from wallets w where w.user_id = v_uid;
end;
$$;

revoke all on function set_avatar(text) from public, anon;
grant execute on function set_avatar(text) to authenticated;

-- ============================================================
-- RPC: avatar_market — catálogo enriquecido para el usuario actual
--   owned / equipped / effective_cost (lo que pagaría AHORA) y si aún
--   tiene su primera-vez-gratis disponible.
-- ============================================================
create or replace function avatar_market()
returns table (
  code text, name text, archetype text, image_path text, image_ready boolean,
  price bigint, sort_order int, owned boolean, equipped boolean,
  effective_cost bigint, free_pick_available boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_equipped  text;
  v_used_free boolean;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select p.avatar_code into v_equipped from profiles p where p.id = v_uid;
  v_used_free := exists (select 1 from profile_avatars pa where pa.user_id = v_uid);

  return query
    select
      a.code, a.name, a.archetype, a.image_path, a.image_ready,
      a.price, a.sort_order,
      (po.user_id is not null)                      as owned,
      (a.code = v_equipped)                         as equipped,
      case
        when po.user_id is not null then 0::bigint  -- ya lo posee
        when a.price = 0 then 0::bigint             -- gratis
        when not v_used_free then 0::bigint         -- primera vez gratis
        else a.price
      end                                           as effective_cost,
      (not v_used_free)                             as free_pick_available
    from avatars a
    left join profile_avatars po
      on po.avatar_code = a.code and po.user_id = v_uid
    where a.is_active
    order by a.sort_order, a.code;
end;
$$;

revoke all on function avatar_market() from public, anon;
grant execute on function avatar_market() to authenticated;

-- ============================================================
-- Semilla del catálogo
--   avatar-1 = el avatar clásico actual (arte ya disponible, gratis).
--   El resto son marcadores con precios de ejemplo; el arte real se sube
--   luego (image_ready pasa a true al colocar el webp).
-- ============================================================
insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order) values
  ('avatar-1', 'El Clásico',     'ejecutivo',   '/assets/avatar-1.webp',        true,      0, 0),
  ('avatar-2', 'La Heredera',    'heredera',    '/assets/avatars/avatar-2.webp', false,  2000, 1),
  ('avatar-3', 'El Estratega',   'estratega',   '/assets/avatars/avatar-3.webp', false,  5000, 2),
  ('avatar-4', 'La Diplomática', 'diplomatica', '/assets/avatars/avatar-4.webp', false,  5000, 3),
  ('avatar-5', 'El Magnate',     'magnate',     '/assets/avatars/avatar-5.webp', false, 12000, 4),
  ('avatar-6', 'La Coleccionista','coleccionista','/assets/avatars/avatar-6.webp', false, 12000, 5),
  ('avatar-7', 'El Diplomata',   'diplomata',   '/assets/avatars/avatar-7.webp', false, 25000, 6),
  ('avatar-8', 'La Visionaria',  'visionaria',  '/assets/avatars/avatar-8.webp', false, 25000, 7),
  ('avatar-9', 'El Soberano',    'soberano',    '/assets/avatars/avatar-9.webp', false, 50000, 8)
on conflict (code) do nothing;
