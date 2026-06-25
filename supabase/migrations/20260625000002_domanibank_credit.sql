-- ============================================================
-- DOMANI — Domanibank: línea de crédito real
-- ============================================================
-- Crédito acotado y seguro (no imprime Aurelios):
--   - UN crédito activo a la vez por ciudadano (índice único parcial).
--   - Cupo calculado por el SERVIDOR según saldo + Influencia, con tope.
--   - Interés fijo al originar (15%) a 30 días. El repago sale del saldo.
--   - Desembolso y repago pasan por _credit_ledger (regla técnica suprema).
--
-- Nota de buckets: usamos 'earned' para mover el saldo cacheado por
-- columnas conocidas del wallet. La SEMÁNTICA real ('préstamo' / 'pago')
-- vive en ledger.reason ('loan_disburse' / 'loan_repay') y en metadata.
-- ============================================================

-- Nuevas razones de ledger (PG17: se pueden añadir en transacción; el
-- valor solo se USA en ejecución posterior, nunca durante la migración).
alter type ledger_reason add value if not exists 'loan_disburse';
alter type ledger_reason add value if not exists 'loan_repay';

create table if not exists loans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  principal    bigint not null check (principal > 0),
  interest_bps int    not null default 1500,         -- 15.00%
  total_due    bigint not null,                       -- principal + interés
  outstanding  bigint not null,                       -- lo que falta por pagar
  term_days    int    not null default 30,
  due_date     date   not null,
  status       text   not null default 'active' check (status in ('active','paid')),
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz
);

-- Un solo crédito ACTIVO por ciudadano.
create unique index if not exists uniq_active_loan
  on loans(user_id) where status = 'active';

alter table loans enable row level security;
drop policy if exists loans_read on loans;
create policy loans_read on loans
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on loans from authenticated;

-- ----------------------------------------------------------------
-- bank_credit_quote: cupo disponible (server-side).
--   cupo = 40% del saldo + 200 * Influencia, tope 250.000, redondeado
--   a miles. Si ya hay crédito activo, el cupo es 0.
-- ----------------------------------------------------------------
create or replace function bank_credit_quote()
returns table(cupo bigint, has_active_loan boolean, interest_bps int, term_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint;
  v_infl int;
  v_active boolean;
  v_cupo bigint;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select coalesce(w.balance,0) into v_balance from wallets w where w.user_id = v_uid;
  select coalesce(p.influence,0) into v_infl from profiles p where p.id = v_uid;
  select exists(select 1 from loans where user_id = v_uid and status = 'active') into v_active;

  if v_active then
    v_cupo := 0;
  else
    v_cupo := least(250000, greatest(0, (floor(v_balance * 0.4))::bigint + v_infl * 200));
    v_cupo := (v_cupo / 1000) * 1000;  -- redondeo a miles
  end if;

  return query select v_cupo, v_active, 1500, 30;
end;
$$;

revoke all on function bank_credit_quote() from public;
grant execute on function bank_credit_quote() to authenticated;

-- ----------------------------------------------------------------
-- bank_take_loan: solicita un crédito por p_principal.
-- ----------------------------------------------------------------
create or replace function bank_take_loan(p_principal bigint)
returns table(loan_id uuid, total_due bigint, outstanding bigint, due_date date, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint;
  v_infl int;
  v_cupo bigint;
  v_total bigint;
  v_loan loans;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;
  if exists(select 1 from loans where user_id = v_uid and status = 'active') then
    raise exception 'ya tienes un crédito activo';
  end if;
  if p_principal is null or p_principal <= 0 then
    raise exception 'monto inválido';
  end if;

  select coalesce(w.balance,0) into v_balance from wallets w where w.user_id = v_uid;
  select coalesce(p.influence,0) into v_infl from profiles p where p.id = v_uid;
  v_cupo := least(250000, greatest(0, (floor(v_balance * 0.4))::bigint + v_infl * 200));
  v_cupo := (v_cupo / 1000) * 1000;

  if p_principal > v_cupo then
    raise exception 'monto supera tu cupo (% Aurelios)', v_cupo;
  end if;

  v_total := p_principal + (p_principal * 1500) / 10000;  -- +15%

  insert into loans(user_id, principal, interest_bps, total_due, outstanding, term_days, due_date)
  values (v_uid, p_principal, 1500, v_total, v_total, 30, current_date + 30)
  returning * into v_loan;

  perform _credit_ledger(
    v_uid, p_principal, 'earned', 'loan_disburse',
    'loan', v_loan.id,
    jsonb_build_object('principal', p_principal, 'total_due', v_total)
  );

  return query
    select v_loan.id, v_loan.total_due, v_loan.outstanding, v_loan.due_date,
           coalesce((select w.balance from wallets w where w.user_id = v_uid), 0);
end;
$$;

revoke all on function bank_take_loan(bigint) from public;
grant execute on function bank_take_loan(bigint) to authenticated;

-- ----------------------------------------------------------------
-- bank_repay: abona p_amount al crédito activo (sale del saldo).
-- ----------------------------------------------------------------
create or replace function bank_repay(p_amount bigint)
returns table(outstanding bigint, status text, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint;
  v_loan loans;
  v_pay bigint;
  v_new_out bigint;
  v_status text;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_loan from loans
  where user_id = v_uid and status = 'active' for update;
  if not found then
    raise exception 'no tienes crédito activo';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'monto inválido';
  end if;

  select coalesce(w.balance,0) into v_balance from wallets w where w.user_id = v_uid;
  v_pay := least(p_amount, v_loan.outstanding, v_balance);
  if v_pay <= 0 then
    raise exception 'saldo insuficiente para abonar';
  end if;

  v_new_out := v_loan.outstanding - v_pay;
  v_status := case when v_new_out <= 0 then 'paid' else 'active' end;

  update loans
  set outstanding = v_new_out,
      status = v_status,
      closed_at = case when v_status = 'paid' then now() else null end
  where id = v_loan.id;

  perform _credit_ledger(
    v_uid, -v_pay, 'earned', 'loan_repay',
    'loan', v_loan.id,
    jsonb_build_object('paid', v_pay, 'remaining', v_new_out)
  );

  return query
    select v_new_out, v_status,
           coalesce((select w.balance from wallets w where w.user_id = v_uid), 0);
end;
$$;

revoke all on function bank_repay(bigint) from public;
grant execute on function bank_repay(bigint) to authenticated;
