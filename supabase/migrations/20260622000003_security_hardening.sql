-- ============================================================
-- DOMANI — Endurecimiento de seguridad (tras advisors de Supabase)
-- ============================================================

-- 1) search_path fijo en funciones que faltaban (evita secuestro de search_path)
create or replace function fn_apply_ledger() returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function raise_invalid_bet(p text) returns boolean
language plpgsql
set search_path = public
as $$
begin
  raise exception 'tipo de apuesta inválido: %', p;
end;
$$;

-- 2) RLS en tablas que estaban expuestas sin protección.

-- game_sessions: visible para el lobby (sin datos sensibles, solo Aurelios).
alter table game_sessions enable row level security;
drop policy if exists p_sessions_read on game_sessions;
create policy p_sessions_read on game_sessions for select using (true);

-- Catálogos de Fase 2 (propiedades): lectura pública, escritura solo service_role.
alter table countries          enable row level security;
alter table cities             enable row level security;
alter table zones              enable row level security;
alter table property_templates enable row level security;
drop policy if exists p_countries_read on countries;
create policy p_countries_read on countries for select using (true);
drop policy if exists p_cities_read on cities;
create policy p_cities_read on cities for select using (true);
drop policy if exists p_zones_read on zones;
create policy p_zones_read on zones for select using (true);
drop policy if exists p_proptpl_read on property_templates;
create policy p_proptpl_read on property_templates for select using (true);

-- Auditoría / antifraude: SENSIBLE. RLS activado SIN políticas =
-- el cliente nunca lee ni escribe; solo service_role (que salta RLS).
alter table audit_logs enable row level security;
alter table risk_flags enable row level security;

-- 3) Revocaciones explícitas de roles públicos en funciones económicas.
--    Las funciones de usuario quedan SOLO para 'authenticated'.
revoke all on function _credit_ledger(uuid,bigint,aureli_bucket,ledger_reason,text,uuid,jsonb) from anon, authenticated;
revoke all on function settle_session(uuid,jsonb) from anon, authenticated;

-- fn_apply_ledger es un TRIGGER: nadie debe invocarlo como RPC.
revoke all on function fn_apply_ledger() from public, anon, authenticated;

revoke all on function bootstrap_profile(text,boolean) from anon;
revoke all on function choose_house(text) from anon;
revoke all on function claim_renta(text) from anon;
revoke all on function answer_academy_question(uuid,int) from anon;
revoke all on function spin_roulette_free(text,int) from anon;
