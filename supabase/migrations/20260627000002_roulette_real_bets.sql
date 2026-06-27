-- ============================================================
-- Ruleta con Aurelios reales — apuestas múltiples (MVP)
-- ============================================================
-- Complementa spin_roulette_free (giro gratis de entrada) con la
-- mesa de Aurelios reales: el jugador apila varias apuestas en el
-- tapete y las liquida en UN giro.
--
-- Principios respetados:
--   - RNG SERVER-SIDE (anti-fraude): el cliente nunca decide el número.
--     La rueda visual sólo ANIMA la bola hasta el número que sale aquí.
--   - El stake se debita atómicamente; las ganadoras devuelven
--     stake * (cuota + 1). Todo movimiento pasa por el ledger.
--   - Tope de apuesta por giro: no puedes sentar todo tu patrimonio.
--
-- p_bets: jsonb array de objetos
--   { "type": text, "value": int|null, "stake": bigint }
--   type ∈ straight|red|black|even|odd|low|high|dozen|column
--   value: straight 0..36 · dozen 1..3 · column 1..3
-- ------------------------------------------------------------

create or replace function spin_roulette(
  p_bets jsonb
) returns table(
  result_number int,
  is_red        boolean,
  total_staked  bigint,
  total_return  bigint,
  net           bigint,
  balance       bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_game_id   uuid;
  v_session_id uuid;
  v_min_total bigint := 1;          -- apuesta mínima por giro
  v_max_total bigint := 100000;     -- tope de apuesta por giro (anti-all-in)
  v_number    int;
  v_is_red    boolean;
  v_staked    bigint := 0;
  v_return    bigint := 0;
  v_bal       bigint;
  v_bet       jsonb;
  v_type      text;
  v_value     int;
  v_stake     bigint;
  v_won       boolean;
  v_mult      int;
  red_numbers int[] := array[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  if p_bets is null or jsonb_typeof(p_bets) <> 'array' or jsonb_array_length(p_bets) = 0 then
    raise exception 'no hay apuestas';
  end if;

  select id into v_game_id from games where code = 'roulette';
  if v_game_id is null then
    raise exception 'juego roulette no sembrado';
  end if;

  -- 1) Validar apuestas y acumular el total apostado.
  for v_bet in select * from jsonb_array_elements(p_bets)
  loop
    v_type  := v_bet->>'type';
    v_stake := coalesce((v_bet->>'stake')::bigint, 0);
    v_value := nullif(v_bet->>'value','')::int;

    if v_stake <= 0 then
      raise exception 'apuesta inválida: stake debe ser > 0';
    end if;

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

  if v_staked < v_min_total then
    raise exception 'apuesta mínima por giro: % Aurelios', v_min_total;
  end if;
  if v_staked > v_max_total then
    raise exception 'tope de apuesta por giro: % Aurelios', v_max_total;
  end if;

  -- Saldo suficiente
  select w.balance into v_bal from wallets w where w.user_id = v_uid;
  if coalesce(v_bal,0) < v_staked then
    raise exception 'saldo insuficiente para apostar % Aurelios', v_staked;
  end if;

  -- 2) RNG server-side: 0..36 (ruleta europea, un solo cero).
  v_number := floor(random() * 37)::int;
  v_is_red := v_number = any(red_numbers);

  -- 3) Calcular el retorno total de las apuestas ganadoras.
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
      v_mult := case v_type
        when 'straight' then 35
        when 'dozen'    then 2
        when 'column'   then 2
        else 1
      end;
      v_return := v_return + v_stake * (v_mult + 1);
    end if;
  end loop;

  -- 4) Registrar la "partida" (host null = banca/sistema) y resultados.
  insert into game_sessions(game_id, host_user_id, buyin_aurelios, max_seats, status)
  values (v_game_id, null, v_staked, 1, 'finished')
  returning id into v_session_id;

  insert into game_entries(session_id, user_id, seat) values (v_session_id, v_uid, 1);

  insert into game_results(session_id, user_id, position, aurelios_delta, influence_delta)
  values (v_session_id, v_uid,
          case when v_return >= v_staked then 1 else 2 end,
          (v_return - v_staked), 0);

  -- 5) Movimientos de Aurelios (ledger = fuente de verdad).
  --    Débito del total apostado.
  perform _credit_ledger(
    v_uid, -v_staked, 'earned', 'game_buyin',
    'game_session', v_session_id,
    jsonb_build_object('game','roulette','number',v_number,'bets',p_bets)
  );
  --    Crédito del retorno (si hubo ganancias).
  if v_return > 0 then
    perform _credit_ledger(
      v_uid, v_return, 'earned', 'game_win',
      'game_session', v_session_id,
      jsonb_build_object('game','roulette','number',v_number,'staked',v_staked)
    );
  end if;

  select w.balance into v_bal from wallets w where w.user_id = v_uid;

  return query select v_number, v_is_red, v_staked, v_return,
                      (v_return - v_staked), v_bal;
end;
$$;

revoke all on function spin_roulette(jsonb) from public;
grant execute on function spin_roulette(jsonb) to authenticated;
