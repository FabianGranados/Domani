-- ============================================================
-- DOMANI — Mudanza de ciudad con impuesto progresivo (sumidero)
-- ============================================================
-- Cambiar de ciudad cuesta. Reglas:
--   - 1ª mudanza GRATIS (gracia, para corregir una mala elección).
--   - Luego 10% del patrimonio (efectivo), +5 puntos por cada mudanza pagada
--     en los últimos 90 días, tope 30%, mínimo ⟡5.000.
--   - Enfriamiento de 30 días entre mudanzas.
--   - El impuesto sale por _credit_ledger ('mudanza_tax') = sumidero a Hacienda.
-- choose_house queda SOLO para el pick inicial (sin ciudad). Cambios -> mudarse.
-- ============================================================

create table if not exists city_moves (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles(id) on delete cascade,
  from_house uuid references houses(id),
  to_house  uuid not null references houses(id),
  fee       bigint not null default 0,
  fee_pct   numeric not null default 0,
  moved_at  timestamptz not null default now()
);
create index if not exists idx_city_moves_user on city_moves(user_id, moved_at desc);
alter table city_moves enable row level security;
drop policy if exists p_city_moves_read on city_moves;
create policy p_city_moves_read on city_moves for select using (auth.uid() = user_id);

create or replace function choose_house(p_house_code text)
returns profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); v_house houses; v_profile profiles; v_current uuid;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  select house_id into v_current from profiles where id = v_uid;
  if v_current is not null then raise exception 'ya tienes ciudad; para cambiarte usa una mudanza'; end if;
  select * into v_house from houses where code = p_house_code;
  if not found then raise exception 'ciudad inexistente: %', p_house_code; end if;
  insert into house_memberships(user_id, house_id) values (v_uid, v_house.id)
  on conflict (user_id) do update set house_id = excluded.house_id, joined_at = now();
  update profiles set house_id = v_house.id, updated_at = now() where id = v_uid returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function choose_house(text) from public, anon;
grant execute on function choose_house(text) to authenticated;

create or replace function _mudanza_calc(p_uid uuid, p_target uuid)
returns table (is_free boolean, fee_pct numeric, fee bigint, days_left int, balance bigint, current boolean)
language plpgsql security definer set search_path = public
as $$
declare v_bal bigint; v_cur uuid; v_count int; v_paid90 int; v_last timestamptz; v_pct numeric; v_fee bigint;
begin
  select w.balance into v_bal from wallets w where w.user_id = p_uid;
  select p.house_id into v_cur from profiles p where p.id = p_uid;
  select count(*), max(m.moved_at) into v_count, v_last from city_moves m where m.user_id = p_uid;
  select count(*) into v_paid90 from city_moves m where m.user_id = p_uid and m.fee > 0 and m.moved_at > now() - interval '90 days';
  is_free := (v_count = 0);
  if is_free then v_pct := 0; v_fee := 0;
  else
    v_pct := least(0.30, 0.10 + 0.05 * v_paid90);
    v_fee := greatest(5000, round(v_pct * coalesce(v_bal,0))::bigint);
  end if;
  days_left := case when v_last is null then 0
                    else greatest(0, 30 - floor(extract(epoch from (now() - v_last))/86400)::int) end;
  fee_pct := v_pct; fee := v_fee; balance := coalesce(v_bal,0); current := (v_cur = p_target);
  return next;
end;
$$;
revoke all on function _mudanza_calc(uuid,uuid) from public, anon, authenticated;

create or replace function mudanza_quote(p_house_code text)
returns table (is_free boolean, fee_pct numeric, fee bigint, days_left int, balance bigint, current boolean, can_move boolean)
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_target uuid; r record;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  select id into v_target from houses where code = p_house_code;
  if v_target is null then raise exception 'ciudad inexistente'; end if;
  select * into r from _mudanza_calc(v_uid, v_target);
  is_free := r.is_free; fee_pct := r.fee_pct; fee := r.fee; days_left := r.days_left;
  balance := r.balance; current := r.current;
  can_move := (not r.current) and r.days_left = 0 and r.balance >= r.fee;
  return next;
end;
$$;
revoke all on function mudanza_quote(text) from public, anon;
grant execute on function mudanza_quote(text) to authenticated;

create or replace function mudarse(p_house_code text)
returns table (house_code text, fee bigint, fee_pct numeric, balance bigint)
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_target uuid; v_from uuid; r record;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  select id into v_target from houses where code = p_house_code;
  if v_target is null then raise exception 'ciudad inexistente'; end if;
  select house_id into v_from from profiles where id = v_uid;
  if v_from = v_target then raise exception 'ya vives en esa ciudad'; end if;
  select * into r from _mudanza_calc(v_uid, v_target);
  if r.days_left > 0 then raise exception 'mudanza en enfriamiento: faltan % días', r.days_left; end if;
  if r.fee > 0 and r.balance < r.fee then raise exception 'saldo insuficiente para la mudanza'; end if;
  if r.fee > 0 then
    perform _credit_ledger(v_uid, -r.fee, 'earned', 'mudanza_tax', 'mudanza', v_target,
      jsonb_build_object('to', p_house_code, 'pct', r.fee_pct));
  end if;
  insert into house_memberships(user_id, house_id) values (v_uid, v_target)
  on conflict (user_id) do update set house_id = excluded.house_id, joined_at = now();
  update profiles set house_id = v_target, updated_at = now() where id = v_uid;
  insert into city_moves(user_id, from_house, to_house, fee, fee_pct) values (v_uid, v_from, v_target, r.fee, r.fee_pct);
  house_code := p_house_code; fee := r.fee; fee_pct := r.fee_pct;
  select w.balance into balance from wallets w where w.user_id = v_uid;
  return next;
end;
$$;
revoke all on function mudarse(text) from public, anon;
grant execute on function mudarse(text) to authenticated;
