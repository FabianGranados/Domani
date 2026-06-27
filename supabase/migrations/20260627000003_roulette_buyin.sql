-- ============================================================
-- Ruleta: caja / buy-in de fichas (modelo casino real)
-- ============================================================
-- Como en un casino: no entras con toda tu billetera. Compras una
-- cantidad de FICHAS en la caja y dentro de la mesa apuestas solo con
-- esas fichas. El resto de tus Aurelios queda intocable en la billetera.
--
-- Las fichas de mesa viven en el SERVIDOR (roulette_sessions), no en el
-- cliente: así no se pueden inflar y el anti-fraude se mantiene.
--   - roulette_buyin(amount): debita billetera -> suma fichas a la mesa.
--   - spin_roulette(bets):    apuesta contra las fichas (no la billetera).
--   - roulette_cashout():     devuelve las fichas restantes a la billetera.
-- ------------------------------------------------------------

create table if not exists roulette_sessions (
  user_id    uuid primary key references profiles(id) on delete cascade,
  chips      bigint not null default 0 check (chips >= 0),
  opened_at  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table roulette_sessions enable row level security;

drop policy if exists roulette_sessions_self_read on roulette_sessions;
create policy roulette_sessions_self_read on roulette_sessions
  for select using (user_id = auth.uid());
-- No hay policies de escritura: solo las funciones SECURITY DEFINER mutan la tabla.

-- ----------------------------------------------------------------
-- roulette_buyin: convierte Aurelios de la billetera en fichas de mesa.
-- ----------------------------------------------------------------
create or replace function roulette_buyin(p_amount bigint)
returns bigint                       -- fichas en la mesa tras el buy-in
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_bal   bigint;
  v_chips bigint;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if p_amount <= 0 then raise exception 'monto inválido'; end if;

  select balance into v_bal from wallets where user_id = v_uid;
  if coalesce(v_bal,0) < p_amount then
    raise exception 'saldo insuficiente para comprar % fichas', p_amount;
  end if;

  perform _credit_ledger(v_uid, -p_amount, 'earned', 'game_buyin', 'roulette', null,
    jsonb_build_object('game','roulette','tipo','buyin'));

  insert into roulette_sessions(user_id, chips)
  values (v_uid, p_amount)
  on conflict (user_id) do update
    set chips = roulette_sessions.chips + excluded.chips,
        updated_at = now()
  returning chips into v_chips;

  return v_chips;
end;
$$;

revoke all on function roulette_buyin(bigint) from public;
grant execute on function roulette_buyin(bigint) to authenticated;

-- ----------------------------------------------------------------
-- roulette_cashout: devuelve las fichas restantes a la billetera y
-- cierra la sesión de mesa.
-- ----------------------------------------------------------------
create or replace function roulette_cashout()
returns bigint                       -- saldo de billetera tras retirar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_chips bigint;
  v_bal   bigint;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;

  select chips into v_chips from roulette_sessions where user_id = v_uid;
  v_chips := coalesce(v_chips, 0);

  if v_chips > 0 then
    perform _credit_ledger(v_uid, v_chips, 'earned', 'game_win', 'roulette', null,
      jsonb_build_object('game','roulette','tipo','cashout'));
  end if;

  delete from roulette_sessions where user_id = v_uid;

  select balance into v_bal from wallets where user_id = v_uid;
  return coalesce(v_bal, 0);
end;
$$;

revoke all on function roulette_cashout() from public;
grant execute on function roulette_cashout() to authenticated;

-- ----------------------------------------------------------------
-- spin_roulette: ahora apuesta contra las FICHAS DE MESA (no la
-- billetera). RNG server-side; el cliente solo anima la bola.
-- Devuelve el número, el neto y las fichas resultantes en la mesa.
-- ----------------------------------------------------------------
-- La versión previa devolvía 'balance'; cambia el tipo de retorno.
drop function if exists spin_roulette(jsonb);

create or replace function spin_roulette(
  p_bets jsonb
) returns table(
  result_number int,
  is_red        boolean,
  total_staked  bigint,
  total_return  bigint,
  net           bigint,
  chips         bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_game_id   uuid;
  v_session_id uuid;
  v_min_total bigint := 1;
  v_max_total bigint := 100000;   -- tope de apuesta por giro
  v_number    int;
  v_is_red    boolean;
  v_staked    bigint := 0;
  v_return    bigint := 0;
  v_chips     bigint;
  v_bet       jsonb;
  v_type      text;
  v_value     int;
  v_stake     bigint;
  v_won       boolean;
  v_mult      int;
  red_numbers int[] := array[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
begin
  if v_uid is null then raise exception 'no autenticado'; end if;

  if p_bets is null or jsonb_typeof(p_bets) <> 'array' or jsonb_array_length(p_bets) = 0 then
    raise exception 'no hay apuestas';
  end if;

  select id into v_game_id from games where code = 'roulette';
  if v_game_id is null then raise exception 'juego roulette no sembrado'; end if;

  -- Fichas en la mesa (bloqueamos la fila para liquidar atómicamente).
  select chips into v_chips from roulette_sessions where user_id = v_uid for update;
  if v_chips is null then raise exception 'no tienes fichas en la mesa (pasa por la caja)'; end if;

  -- 1) Validar apuestas y acumular el total apostado.
  for v_bet in select * from jsonb_array_elements(p_bets)
  loop
    v_type  := v_bet->>'type';
    v_stake := coalesce((v_bet->>'stake')::bigint, 0);
    v_value := nullif(v_bet->>'value','')::int;

    if v_stake <= 0 then raise exception 'apuesta inválida: stake debe ser > 0'; end if;
    if v_type not in ('straight','red','black','even','odd','low','high','dozen','column') then
      raise exception 'tipo de apuesta inválido: %', v_type;
    end if;
    if v_type = 'straight' and (v_value is null or v_value < 0 or v_value > 36) then
      raise exception 'pleno requiere número 0..36';
    end if;
    if v_type in ('dozen','column') and (v_value is null or v_value < 1 or v_value > 3) then
      raise exception '% requiere valor 1..3', v_type;
    end if;

    v_staked := v_staked + v_stake;
  end loop;

  if v_staked < v_min_total then raise exception 'apuesta mínima por giro: % fichas', v_min_total; end if;
  if v_staked > v_max_total then raise exception 'tope de apuesta por giro: % fichas', v_max_total; end if;
  if v_staked > v_chips then raise exception 'no tienes fichas suficientes (% en la mesa)', v_chips; end if;

  -- 2) RNG server-side: 0..36 (ruleta europea, un solo cero).
  v_number := floor(random() * 37)::int;
  v_is_red := v_number = any(red_numbers);

  -- 3) Retorno total de las apuestas ganadoras.
  for v_bet in select * from jsonb_array_elements(p_bets)
  loop
    v_type  := v_bet->>'type';
    v_stake := (v_bet->>'stake')::bigint;
    v_value := nullif(v_bet->>'value','')::int;

    v_won := case v_type
      when 'straight' then (v_value = v_number)
      when 'red'      then v_is_red and v_number <> 0
      when 'black'    then (not v_is_red) and v_number <> 0
      when 'even'     then v_number <> 0 and v_number % 2 = 0
      when 'odd'      then v_number % 2 = 1
      when 'low'      then v_number between 1 and 18
      when 'high'     then v_number between 19 and 36
      when 'dozen'    then (v_value = 1 and v_number between 1 and 12)
                        or (v_value = 2 and v_number between 13 and 24)
                        or (v_value = 3 and v_number between 25 and 36)
      when 'column'   then v_number <> 0 and (
                           (v_value = 1 and v_number % 3 = 1)
                        or (v_value = 2 and v_number % 3 = 2)
                        or (v_value = 3 and v_number % 3 = 0))
      else false
    end;

    if v_won then
      v_mult := case v_type when 'straight' then 35 when 'dozen' then 2 when 'column' then 2 else 1 end;
      v_return := v_return + v_stake * (v_mult + 1);
    end if;
  end loop;

  -- 4) Actualizar las fichas de la mesa (neto = retorno - apostado).
  update roulette_sessions
    set chips = chips - v_staked + v_return,
        updated_at = now()
  where user_id = v_uid
  returning chips into v_chips;

  -- 5) Registrar la "partida" para historial (sin tocar la billetera).
  insert into game_sessions(game_id, host_user_id, buyin_aurelios, max_seats, status)
  values (v_game_id, null, v_staked, 1, 'finished')
  returning id into v_session_id;

  insert into game_entries(session_id, user_id, seat) values (v_session_id, v_uid, 1);

  insert into game_results(session_id, user_id, position, aurelios_delta, influence_delta)
  values (v_session_id, v_uid,
          case when v_return >= v_staked then 1 else 2 end,
          (v_return - v_staked), 0);

  return query select v_number, v_is_red, v_staked, v_return,
                      (v_return - v_staked), v_chips;
end;
$$;

revoke all on function spin_roulette(jsonb) from public;
grant execute on function spin_roulette(jsonb) to authenticated;
