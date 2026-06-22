-- ============================================================
-- DOMANI — Capa económica server-side (RPC / funciones)
-- ============================================================
-- REGLA TÉCNICA SUPREMA: ningún saldo se modifica directo.
-- Todo movimiento de Aurelios pasa por ledger_transactions.
--
-- Estas funciones son SECURITY DEFINER (corren como dueño, saltan RLS) =
-- el equivalente a service_role para las operaciones que DEBEN ser
-- controladas por el servidor.
--
-- CLAVE DE SEGURIDAD:
--   - Funciones donde el SERVIDOR calcula el resultado (RNG, corrección de
--     respuesta, monto fijo) pueden exponerse a 'authenticated': el cliente
--     solo declara su intención (apuesta, respuesta), nunca el premio.
--   - settle_session() acepta deltas arbitrarios -> SOLO service_role.
--     Si se expusiera a 'authenticated', un usuario podría acuñar Aurelios.
-- ============================================================

-- ----------------------------------------------------------------
-- Helper interno: inserta una transacción en el ledger.
-- NO se expone a nadie (revocado de public). Solo lo llaman otras
-- funciones SECURITY DEFINER de este archivo.
-- ----------------------------------------------------------------
create or replace function _credit_ledger(
  p_user_id   uuid,
  p_amount    bigint,
  p_bucket    aureli_bucket,
  p_reason    ledger_reason,
  p_ref_type  text default null,
  p_ref_id    uuid default null,
  p_metadata  jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
begin
  -- Bloqueo legal: el bucket 'purchased' está DESHABILITADO en el MVP.
  if p_bucket = 'purchased' then
    raise exception 'bucket purchased deshabilitado en el MVP (principio legal #1)';
  end if;

  insert into ledger_transactions(user_id, amount, bucket, reason, status, ref_type, ref_id, metadata)
  values (p_user_id, p_amount, p_bucket, p_reason, 'confirmed', p_ref_type, p_ref_id, p_metadata)
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

revoke all on function _credit_ledger(uuid,bigint,aureli_bucket,ledger_reason,text,uuid,jsonb) from public;

-- ----------------------------------------------------------------
-- bootstrap_profile: crea profile + wallet + tessera para el usuario
-- autenticado (MVP 4.1). Requiere +18. Idempotente.
-- ----------------------------------------------------------------
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

  -- Si ya existe el perfil, lo devolvemos (idempotente).
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

  return v_profile;
end;
$$;

revoke all on function bootstrap_profile(text,boolean) from public;
grant execute on function bootstrap_profile(text,boolean) to authenticated;

-- ----------------------------------------------------------------
-- choose_house: el usuario elige 1 de las 6 Casas (MVP 4.2).
-- Una Casa a la vez (unique en house_memberships).
-- ----------------------------------------------------------------
create or replace function choose_house(p_house_code text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_house houses;
  v_profile profiles;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_house from houses where code = p_house_code;
  if not found then
    raise exception 'Casa inexistente: %', p_house_code;
  end if;

  insert into house_memberships(user_id, house_id)
  values (v_uid, v_house.id)
  on conflict (user_id) do update set house_id = excluded.house_id, joined_at = now();

  update profiles set house_id = v_house.id, updated_at = now()
  where id = v_uid
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function choose_house(text) from public;
grant execute on function choose_house(text) to authenticated;

-- ----------------------------------------------------------------
-- claim_renta: Renta Ciudadana diaria (MVP 4.5).
-- Una vez por día (unique user_id, claim_date). Idempotente: si ya
-- reclamó hoy, lanza error claro.
-- ----------------------------------------------------------------
create or replace function claim_renta(p_action text default 'login_diario')
returns table(amount bigint, claim_date date, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amount bigint := 50;            -- asignación diaria base (Aurelios)
  v_claim renta_claims;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  begin
    insert into renta_claims(user_id, amount, action)
    values (v_uid, v_amount, coalesce(p_action, 'login_diario'))
    returning * into v_claim;
  exception when unique_violation then
    raise exception 'la Renta Ciudadana ya fue reclamada hoy';
  end;

  perform _credit_ledger(
    v_uid, v_amount, 'promotional', 'renta_ciudadana',
    'renta_claim', v_claim.id,
    jsonb_build_object('action', p_action)
  );

  return query
    select v_claim.amount, v_claim.claim_date, w.balance
    from wallets w where w.user_id = v_uid;
end;
$$;

revoke all on function claim_renta(text) from public;
grant execute on function claim_renta(text) to authenticated;

-- ----------------------------------------------------------------
-- answer_academy_question: responde una pregunta (MVP 4.6).
-- El SERVIDOR decide si es correcta y cuánto premia (el cliente NO
-- envía el premio). La recompensa solo se otorga la PRIMERA vez que
-- se acierta cada pregunta (anti-farmeo).
-- ----------------------------------------------------------------
create or replace function answer_academy_question(
  p_question_id uuid,
  p_chosen_index int
) returns table(
  is_correct boolean,
  reward_aurelios int,
  reward_influence int,
  correct_index int,
  already_rewarded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q academy_questions;
  v_correct boolean;
  v_prior_correct boolean;
  v_reward_a int := 0;
  v_reward_i int := 0;
  v_attempt_id uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_q from academy_questions where id = p_question_id and is_active = true;
  if not found then
    raise exception 'pregunta inexistente o inactiva';
  end if;

  v_correct := (p_chosen_index = v_q.correct_index);

  insert into academy_attempts(user_id, question_id, chosen_index, is_correct)
  values (v_uid, p_question_id, p_chosen_index, v_correct)
  returning id into v_attempt_id;

  -- ¿Ya había acertado esta pregunta antes? (no se premia dos veces)
  select exists(
    select 1 from academy_attempts
    where user_id = v_uid and question_id = p_question_id
      and is_correct = true and id <> v_attempt_id
  ) into v_prior_correct;

  if v_correct and not v_prior_correct then
    v_reward_a := v_q.reward_aurelios;
    v_reward_i := v_q.reward_influence;

    perform _credit_ledger(
      v_uid, v_reward_a, 'earned', 'academy_reward',
      'academy_attempt', v_attempt_id,
      jsonb_build_object('question_id', p_question_id, 'category', v_q.category)
    );

    insert into influence_events(user_id, amount, reason)
    values (v_uid, v_reward_i, 'academy_reward');

    update profiles set influence = influence + v_reward_i, updated_at = now()
    where id = v_uid;
  end if;

  return query select
    v_correct,
    v_reward_a,
    v_reward_i,
    v_q.correct_index,
    (v_correct and v_prior_correct);
end;
$$;

revoke all on function answer_academy_question(uuid,int) from public;
grant execute on function answer_academy_question(uuid,int) to authenticated;

-- ----------------------------------------------------------------
-- spin_roulette_free: minijuego de azar de ENTRADA GRATUITA (MVP 4.7).
-- Cierra el ciclo legal: "reponer azar con azar gratis".
--   - buy-in 0 (no se arriesgan Aurelios).
--   - El RNG vive en el SERVIDOR (anti-fraude): el cliente no decide el giro.
--   - Premio en Aurelios solo si gana. Límite diario anti-farmeo.
-- Apuestas soportadas (MVP):
--   p_bet_type: 'straight' (p_bet_value 0..36, paga 35x base)
--               'red'|'black'|'even'|'odd'|'low'|'high' (paga 2x base)
-- ----------------------------------------------------------------
create or replace function spin_roulette_free(
  p_bet_type  text,
  p_bet_value int default null
) returns table(
  result_number int,
  is_red boolean,
  won boolean,
  reward_aurelios bigint,
  balance bigint,
  spins_left int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_game_id uuid;
  v_daily_limit int := 20;
  v_used_today int;
  v_base bigint := 2;            -- recompensa base por giro ganador
  v_number int;
  v_is_red boolean;
  v_won boolean := false;
  v_reward bigint := 0;
  v_session_id uuid;
  -- números rojos en la ruleta europea
  red_numbers int[] := array[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select id into v_game_id from games where code = 'roulette';
  if v_game_id is null then
    raise exception 'juego roulette no sembrado';
  end if;

  -- Límite diario de giros gratis (anti-farmeo)
  select count(*) into v_used_today
  from game_results gr
  join game_sessions gs on gs.id = gr.session_id
  where gr.user_id = v_uid
    and gs.game_id = v_game_id
    and gr.created_at >= current_date;

  if v_used_today >= v_daily_limit then
    raise exception 'límite diario de giros gratis alcanzado (% giros)', v_daily_limit;
  end if;

  -- RNG server-side: 0..36 (ruleta europea, un solo cero)
  v_number := floor(random() * 37)::int;
  v_is_red := v_number = any(red_numbers);

  -- Resolver la apuesta
  v_won := case p_bet_type
    when 'straight' then (p_bet_value is not null and p_bet_value = v_number)
    when 'red'      then v_is_red and v_number <> 0
    when 'black'    then (not v_is_red) and v_number <> 0
    when 'even'     then v_number <> 0 and v_number % 2 = 0
    when 'odd'      then v_number % 2 = 1
    when 'low'      then v_number between 1 and 18
    when 'high'     then v_number between 19 and 36
    else raise_invalid_bet(p_bet_type)
  end;

  if v_won then
    v_reward := case when p_bet_type = 'straight' then v_base * 35 else v_base * 2 end;
  end if;

  -- Registrar la "partida" del sistema (host null = banca/sistema)
  insert into game_sessions(game_id, host_user_id, buyin_aurelios, max_seats, status)
  values (v_game_id, null, 0, 1, 'finished')
  returning id into v_session_id;

  insert into game_entries(session_id, user_id, seat) values (v_session_id, v_uid, 1);

  insert into game_results(session_id, user_id, position, aurelios_delta, influence_delta)
  values (v_session_id, v_uid, case when v_won then 1 else 2 end, v_reward, 0);

  if v_reward > 0 then
    perform _credit_ledger(
      v_uid, v_reward, 'earned', 'game_win',
      'game_session', v_session_id,
      jsonb_build_object('game','roulette','bet_type',p_bet_type,'bet_value',p_bet_value,'number',v_number)
    );
  end if;

  return query
    select v_number, v_is_red, v_won, v_reward, w.balance,
           (v_daily_limit - v_used_today - 1)
    from wallets w where w.user_id = v_uid;
end;
$$;

-- helper para lanzar error de apuesta inválida dentro de un CASE
create or replace function raise_invalid_bet(p text) returns boolean
language plpgsql as $$
begin
  raise exception 'tipo de apuesta inválido: %', p;
end;
$$;

revoke all on function spin_roulette_free(text,int) from public;
grant execute on function spin_roulette_free(text,int) to authenticated;

-- ----------------------------------------------------------------
-- settle_session: liquidación GENÉRICA reutilizable por game-core.
-- Cualquier juego nuevo reporta resultados aquí y el núcleo económico
-- no necesita conocer sus reglas (DOMANI_BUILD_CODE.md §5).
--
-- p_results: jsonb array de
--   { "user_id": uuid, "position": int,
--     "aurelios_delta": bigint, "influence_delta": int }
--
-- ⚠️ Acepta deltas arbitrarios -> SOLO service_role puede ejecutarla.
--    El Worker/Edge Function la llama tras validar las reglas del juego.
-- ----------------------------------------------------------------
create or replace function settle_session(
  p_session_id uuid,
  p_results    jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_uid uuid;
  v_delta bigint;
  v_infl int;
  v_pos int;
  v_buyin bigint;
begin
  if not exists (select 1 from game_sessions where id = p_session_id) then
    raise exception 'sesión inexistente: %', p_session_id;
  end if;

  select buyin_aurelios into v_buyin from game_sessions where id = p_session_id;

  for r in select * from jsonb_array_elements(p_results)
  loop
    v_uid   := (r->>'user_id')::uuid;
    v_delta := coalesce((r->>'aurelios_delta')::bigint, 0);
    v_infl  := coalesce((r->>'influence_delta')::int, 0);
    v_pos   := nullif(r->>'position','')::int;

    insert into game_results(session_id, user_id, position, aurelios_delta, influence_delta)
    values (p_session_id, v_uid, v_pos, v_delta, v_infl);

    if v_delta <> 0 then
      perform _credit_ledger(
        v_uid, v_delta, 'earned',
        case when v_delta >= 0 then 'game_win'::ledger_reason else 'game_loss'::ledger_reason end,
        'game_session', p_session_id, '{}'::jsonb
      );
    end if;

    if v_infl <> 0 then
      insert into influence_events(user_id, amount, reason) values (v_uid, v_infl, 'game_result');
      update profiles set influence = influence + v_infl, updated_at = now() where id = v_uid;
    end if;
  end loop;

  update game_sessions set status = 'finished' where id = p_session_id;
end;
$$;

revoke all on function settle_session(uuid,jsonb) from public;
revoke all on function settle_session(uuid,jsonb) from authenticated;
grant execute on function settle_session(uuid,jsonb) to service_role;
