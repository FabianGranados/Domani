-- ============================================================
-- DOMANI — Millonaurelios (concurso de escalera)
-- ============================================================
-- Concurso tipo "¿quién quiere ser millonario?": 12 escalones de
-- dificultad creciente, dos pisos garantizados (escalón 4 y 8), premio
-- máximo "El Millonaurelio". Una partida por día.
--
-- SEGURIDAD (igual de estricta que la capa económica):
--   - El SERVIDOR califica cada respuesta. El cliente jamás ve el
--     correct_index (column-level grant lo oculta).
--   - El premio lo calcula y acredita SOLO el servidor, según una
--     escalera codificada en la función (no la envía el cliente).
--   - Una partida por día (anti-farmeo) por (user_id, play_date).
--   - Todo Aurelio entra por _credit_ledger (regla técnica suprema).
-- ============================================================

-- ----------------------------------------------------------------
-- Catálogo de preguntas. correct_index queda OCULTO al cliente.
-- ----------------------------------------------------------------
create table if not exists millonaurelios_questions (
  id            uuid primary key default gen_random_uuid(),
  step          int  not null check (step between 1 and 12),
  prompt        text not null,
  options       jsonb not null,           -- array de 4 strings
  correct_index int  not null check (correct_index between 0 and 3),
  category      text not null default 'general',
  is_active     boolean not null default true
);
create index if not exists idx_millon_q_step on millonaurelios_questions(step) where is_active;

alter table millonaurelios_questions enable row level security;
drop policy if exists millon_q_read on millonaurelios_questions;
create policy millon_q_read on millonaurelios_questions
  for select to authenticated using (is_active = true);

-- El cliente solo puede leer columnas NO sensibles (nunca correct_index).
revoke all on millonaurelios_questions from authenticated;
grant select (id, step, prompt, options, category, is_active)
  on millonaurelios_questions to authenticated;

-- ----------------------------------------------------------------
-- Partidas. Una por día. answers acumula el detalle calificado por
-- el servidor: [{step, question_id, chosen_index, is_correct}].
-- ----------------------------------------------------------------
create table if not exists millonaurelios_plays (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  play_date     date not null default current_date,
  status        text not null default 'in_progress'
                  check (status in ('in_progress','won','busted','retired')),
  correct_count int  not null default 0,
  prize         bigint not null default 0,
  answers       jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz,
  unique (user_id, play_date)
);

alter table millonaurelios_plays enable row level security;
drop policy if exists millon_play_read on millonaurelios_plays;
create policy millon_play_read on millonaurelios_plays
  for select to authenticated using (user_id = auth.uid());
-- Sin INSERT/UPDATE para authenticated: todo se mueve por las RPC.
revoke insert, update, delete on millonaurelios_plays from authenticated;

-- ----------------------------------------------------------------
-- Helpers internos (escalera de premios y pisos garantizados).
-- ----------------------------------------------------------------
create or replace function _millon_ladder(p_step int) returns bigint
language sql immutable as $$
  -- premio acumulado al haber superado p_step escalones (1..12)
  select (array[0,500,1000,2000,5000,10000,20000,40000,80000,150000,300000,600000,1000000])[p_step + 1];
$$;

create or replace function _millon_floor(p_correct int) returns bigint
language sql immutable as $$
  -- piso garantizado si revientas habiendo superado p_correct escalones
  select case
    when p_correct >= 12 then 1000000
    when p_correct >= 8  then 80000
    when p_correct >= 4  then 5000
    else 0
  end;
$$;

-- ----------------------------------------------------------------
-- millonaurelios_start: abre (o reanuda / reporta) la partida de hoy.
--   - si ya hay una partida TERMINADA hoy -> la devuelve (cliente
--     muestra "vuelve mañana" con el resultado).
--   - si hay una EN CURSO -> la reanuda.
--   - si no hay -> crea una nueva.
-- ----------------------------------------------------------------
create or replace function millonaurelios_start()
returns table(play_id uuid, status text, correct_count int, prize bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_play millonaurelios_plays;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_play
  from millonaurelios_plays
  where user_id = v_uid and play_date = current_date;

  if not found then
    insert into millonaurelios_plays(user_id) values (v_uid)
    returning * into v_play;
  end if;

  return query select v_play.id, v_play.status, v_play.correct_count, v_play.prize;
end;
$$;

revoke all on function millonaurelios_start() from public;
grant execute on function millonaurelios_start() to authenticated;

-- ----------------------------------------------------------------
-- millonaurelios_answer: responde el escalón en curso.
--   El servidor valida que la pregunta corresponde al escalón
--   esperado, califica, y -si la partida termina- acredita el premio.
-- ----------------------------------------------------------------
create or replace function millonaurelios_answer(
  p_play_id     uuid,
  p_question_id uuid,
  p_chosen_index int
)
returns table(
  is_correct    boolean,
  correct_index int,
  status        text,
  banked        bigint,   -- premio asegurado tras esta respuesta
  prize_awarded bigint,   -- Aurelios acreditados (solo si terminó)
  balance       bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_play millonaurelios_plays;
  v_q millonaurelios_questions;
  v_expected_step int;
  v_correct boolean;
  v_new_count int;
  v_status text;
  v_prize bigint := 0;
  v_awarded bigint := 0;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_play from millonaurelios_plays
  where id = p_play_id and user_id = v_uid for update;
  if not found then
    raise exception 'partida inexistente';
  end if;
  if v_play.status <> 'in_progress' then
    raise exception 'la partida de hoy ya terminó';
  end if;

  v_expected_step := jsonb_array_length(v_play.answers) + 1;

  select * into v_q from millonaurelios_questions
  where id = p_question_id and is_active = true;
  if not found then
    raise exception 'pregunta inexistente o inactiva';
  end if;
  if v_q.step <> v_expected_step then
    raise exception 'pregunta fuera de turno (esperado escalón %)', v_expected_step;
  end if;

  v_correct := (p_chosen_index = v_q.correct_index);

  if v_correct then
    v_new_count := v_expected_step;
    if v_new_count >= 12 then
      v_status := 'won';
      v_prize  := _millon_ladder(12);
    else
      v_status := 'in_progress';
      v_prize  := _millon_ladder(v_new_count);  -- asegurado (aún no acreditado)
    end if;
  else
    v_new_count := v_expected_step - 1;
    v_status := 'busted';
    v_prize  := _millon_floor(v_new_count);
  end if;

  update millonaurelios_plays
  set answers = answers || jsonb_build_object(
        'step', v_expected_step,
        'question_id', p_question_id,
        'chosen_index', p_chosen_index,
        'is_correct', v_correct),
      correct_count = v_new_count,
      status = v_status,
      prize = case when v_status = 'in_progress' then 0 else v_prize end,
      finished_at = case when v_status = 'in_progress' then null else now() end
  where id = p_play_id;

  -- Acreditar solo cuando la partida TERMINA (won / busted).
  if v_status <> 'in_progress' and v_prize > 0 then
    perform _credit_ledger(
      v_uid, v_prize, 'earned', 'game_win',
      'millonaurelios', p_play_id,
      jsonb_build_object('correct', v_new_count, 'outcome', v_status)
    );
    v_awarded := v_prize;
    if v_new_count > 0 then
      update profiles set influence = influence + v_new_count, updated_at = now()
      where id = v_uid;
      insert into influence_events(user_id, amount, reason)
      values (v_uid, v_new_count, 'millonaurelios');
    end if;
  end if;

  return query
    select v_correct, v_q.correct_index, v_status,
           (case when v_status = 'busted' then v_prize else _millon_ladder(v_new_count) end),
           v_awarded,
           coalesce((select w.balance from wallets w where w.user_id = v_uid), 0);
end;
$$;

revoke all on function millonaurelios_answer(uuid,uuid,int) from public;
grant execute on function millonaurelios_answer(uuid,uuid,int) to authenticated;

-- ----------------------------------------------------------------
-- millonaurelios_retire: el jugador se planta y cobra lo asegurado.
-- ----------------------------------------------------------------
create or replace function millonaurelios_retire(p_play_id uuid)
returns table(prize bigint, correct_count int, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_play millonaurelios_plays;
  v_prize bigint;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_play from millonaurelios_plays
  where id = p_play_id and user_id = v_uid for update;
  if not found then
    raise exception 'partida inexistente';
  end if;
  if v_play.status <> 'in_progress' then
    raise exception 'la partida de hoy ya terminó';
  end if;

  v_prize := _millon_ladder(v_play.correct_count);

  update millonaurelios_plays
  set status = 'retired', prize = v_prize, finished_at = now()
  where id = p_play_id;

  if v_prize > 0 then
    perform _credit_ledger(
      v_uid, v_prize, 'earned', 'game_win',
      'millonaurelios', p_play_id,
      jsonb_build_object('correct', v_play.correct_count, 'outcome', 'retired')
    );
    if v_play.correct_count > 0 then
      update profiles set influence = influence + v_play.correct_count, updated_at = now()
      where id = v_uid;
      insert into influence_events(user_id, amount, reason)
      values (v_uid, v_play.correct_count, 'millonaurelios');
    end if;
  end if;

  return query
    select v_prize, v_play.correct_count,
           coalesce((select w.balance from wallets w where w.user_id = v_uid), 0);
end;
$$;

revoke all on function millonaurelios_retire(uuid) from public;
grant execute on function millonaurelios_retire(uuid) to authenticated;

-- ----------------------------------------------------------------
-- Semilla de preguntas (3 por escalón, dificultad creciente).
-- ----------------------------------------------------------------
insert into millonaurelios_questions(step, prompt, options, correct_index, category) values
-- Escalón 1 — muy fácil
(1, '¿De qué color es el cielo en un día despejado?', '["Verde","Azul","Rojo","Negro"]', 1, 'general'),
(1, '¿Cuántas patas tiene un perro?', '["Dos","Seis","Cuatro","Ocho"]', 2, 'general'),
(1, '¿Cuál es la moneda de fantasía de Domani?', '["Dólares","Aurelios","Euros","Pesos"]', 1, 'domani'),
-- Escalón 2
(2, '¿Cuántos días tiene una semana?', '["Cinco","Siete","Diez","Doce"]', 1, 'general'),
(2, '¿Qué animal es conocido como el rey de la selva?', '["El tigre","El elefante","El león","El oso"]', 2, 'general'),
(2, '¿En qué sala de Domani se juega Texas Hold''em?', '["La Academia","La Sala de Juegos","El Mercado","El Banco"]', 1, 'domani'),
-- Escalón 3
(3, '¿Cuál es el planeta más cercano al Sol?', '["Venus","Tierra","Mercurio","Marte"]', 2, 'ciencia'),
(3, '¿Cuántos lados tiene un triángulo?', '["Tres","Cuatro","Cinco","Seis"]', 0, 'matematicas'),
(3, '¿Qué instrumento tiene 88 teclas?', '["La guitarra","El piano","El violín","La flauta"]', 1, 'arte'),
-- Escalón 4 — PISO GARANTIZADO
(4, '¿Cuál es el océano más grande del mundo?', '["Atlántico","Índico","Ártico","Pacífico"]', 3, 'geografia'),
(4, '¿Quién pintó la Mona Lisa?', '["Picasso","Da Vinci","Van Gogh","Miguel Ángel"]', 1, 'arte'),
(4, '¿Cuántos minutos tiene una hora?', '["Cuarenta","Cincuenta","Sesenta","Noventa"]', 2, 'general'),
-- Escalón 5
(5, '¿En qué continente está Egipto?', '["Asia","Europa","África","Oceanía"]', 2, 'geografia'),
(5, '¿Cuál es el resultado de 12 x 12?', '["124","144","132","156"]', 1, 'matematicas'),
(5, '¿Qué gas necesitan las plantas para la fotosíntesis?', '["Oxígeno","Hidrógeno","Dióxido de carbono","Nitrógeno"]', 2, 'ciencia'),
-- Escalón 6
(6, '¿En qué país se encuentra la Torre Eiffel?', '["Italia","Francia","España","Bélgica"]', 1, 'geografia'),
(6, '¿Quién escribió "Cien años de soledad"?', '["Vargas Llosa","Borges","García Márquez","Cortázar"]', 2, 'literatura'),
(6, '¿Cuál es el metal líquido a temperatura ambiente?', '["Hierro","Mercurio","Plomo","Cobre"]', 1, 'ciencia'),
-- Escalón 7
(7, '¿En qué año llegó el ser humano a la Luna por primera vez?', '["1959","1969","1972","1981"]', 1, 'historia'),
(7, '¿Cuál es el río más largo del mundo?', '["Nilo","Amazonas","Yangtsé","Misisipi"]', 1, 'geografia'),
(7, '¿Cuántos huesos tiene aproximadamente el cuerpo humano adulto?', '["106","186","206","306"]', 2, 'ciencia'),
-- Escalón 8 — PISO GARANTIZADO
(8, '¿Qué científico propuso la teoría de la relatividad?', '["Newton","Einstein","Galileo","Hawking"]', 1, 'ciencia'),
(8, '¿Cuál es la capital de Australia?', '["Sídney","Melbourne","Canberra","Perth"]', 2, 'geografia'),
(8, '¿En qué siglo cayó el Imperio Romano de Occidente?', '["Siglo III","Siglo V","Siglo VII","Siglo IX"]', 1, 'historia'),
-- Escalón 9 — difícil
(9, '¿Cuál es el elemento químico con símbolo "Au"?', '["Plata","Oro","Aluminio","Argón"]', 1, 'ciencia'),
(9, '¿Quién compuso "Las cuatro estaciones"?', '["Mozart","Bach","Vivaldi","Beethoven"]', 2, 'arte'),
(9, '¿En qué país nació el filósofo Immanuel Kant?', '["Austria","Suiza","Alemania","Países Bajos"]', 2, 'historia'),
-- Escalón 10 — muy difícil
(10, '¿Cuál es el hueso más pequeño del cuerpo humano?', '["El estribo","El martillo","La falange","El radio"]', 0, 'ciencia'),
(10, '¿En qué año comenzó la Primera Guerra Mundial?', '["1905","1914","1918","1921"]', 1, 'historia'),
(10, '¿Cuál es la unidad básica de información en computación?', '["El píxel","El bit","El byte","El hercio"]', 1, 'ciencia'),
-- Escalón 11 — extremo
(11, '¿Qué matemático formuló el "último teorema" demostrado recién en 1994?', '["Euler","Gauss","Fermat","Riemann"]', 2, 'matematicas'),
(11, '¿Cuál es la estrella más cercana a la Tierra después del Sol?', '["Sirio","Próxima Centauri","Vega","Betelgeuse"]', 1, 'ciencia'),
(11, '¿En qué ciudad se firmó el tratado que creó la Unión Europea en 1992?', '["Roma","Bruselas","Maastricht","Lisboa"]', 2, 'historia'),
-- Escalón 12 — El Millonaurelio
(12, '¿Cuál es la partícula que da masa a las demás, confirmada en 2012?', '["Neutrino","Bosón de Higgs","Quark top","Muón"]', 1, 'ciencia'),
(12, '¿Quién fue el primer emperador romano?', '["Julio César","Augusto","Nerón","Trajano"]', 1, 'historia'),
(12, '¿Cuál es la constante matemática aproximadamente igual a 2.71828?', '["Pi","Phi (áureo)","Número e","Raíz de 2"]', 2, 'matematicas');
