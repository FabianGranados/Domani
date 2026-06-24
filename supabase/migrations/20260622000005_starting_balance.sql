-- ============================================================
-- DOMANI — Saldo inicial de bienvenida (500.000 Aurelios)
-- ============================================================
-- BUG: bootstrap_profile creaba la billetera con balance 0, así que
-- todo ciudadano nuevo empezaba sin Aurelios. Aquí:
--   1) Redefinimos bootstrap_profile para acreditar 500.000 Aurelios
--      de bienvenida vía ledger (bucket 'promotional', razón 'promo_grant').
--      El trigger trg_apply_ledger actualiza el saldo cacheado, así que
--      NO tocamos wallets.balance directamente (regla técnica suprema).
--   2) Es idempotente: si el perfil ya existe, retorna sin acreditar nada;
--      además marcamos el grant con ref_type='welcome_grant' y antes de
--      insertarlo verificamos que no exista ya uno para ese usuario.
-- ============================================================

create or replace function bootstrap_profile(
  p_alias         text,
  p_age_confirmed boolean
) returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles;
  v_welcome constant bigint := 500000;  -- saldo inicial de bienvenida
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;
  if not p_age_confirmed then
    raise exception 'debe confirmar mayoría de edad (+18)';
  end if;
  if p_alias is null or length(trim(p_alias)) < 3 then
    raise exception 'alias inválido (mínimo 3 caracteres)';
  end if;

  -- Si ya existe el perfil, lo devolvemos (idempotente, sin re-acreditar).
  select * into v_profile from profiles where id = v_uid;
  if found then
    return v_profile;
  end if;

  insert into profiles(id, alias, age_confirmed)
  values (v_uid, trim(p_alias), true)
  returning * into v_profile;

  insert into wallets(user_id, balance) values (v_uid, 0)
    on conflict (user_id) do nothing;

  insert into tesseras(user_id) values (v_uid)
    on conflict (user_id) do nothing;

  -- Saldo inicial de bienvenida. Doble salvaguarda anti-doble-grant:
  -- solo si este usuario no tiene ya una transacción 'welcome_grant'.
  if not exists (
    select 1 from ledger_transactions
    where user_id = v_uid and ref_type = 'welcome_grant'
  ) then
    perform _credit_ledger(
      v_uid, v_welcome, 'promotional', 'promo_grant',
      'welcome_grant', v_uid,
      jsonb_build_object('label', 'saldo_inicial_bienvenida')
    );
  end if;

  return v_profile;
end;
$$;

revoke all on function bootstrap_profile(text,boolean) from public;
grant execute on function bootstrap_profile(text,boolean) to authenticated;
