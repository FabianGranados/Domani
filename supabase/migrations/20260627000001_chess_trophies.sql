-- Trofeos de ajedrez: victorias/intentos por retador nombrado (Teo..Encapuchado).
create table if not exists public.chess_trophies (
  user_id      uuid not null references auth.users(id) on delete cascade,
  challenger   text not null check (challenger in ('teo','vera','severo','aurelio','encapuchado')),
  wins         int not null default 0,
  attempts     int not null default 0,
  first_win_at timestamptz,
  last_played_at timestamptz not null default now(),
  primary key (user_id, challenger)
);

alter table public.chess_trophies enable row level security;

-- El dueño puede LEER sus propios trofeos. Escritura solo vía RPC (definer).
drop policy if exists chess_trophies_select_own on public.chess_trophies;
create policy chess_trophies_select_own on public.chess_trophies
  for select using (auth.uid() = user_id);

grant select on public.chess_trophies to authenticated;

-- Registra el resultado de una partida contra un retador nombrado.
-- attempts++ siempre; wins++ solo si gana. Devuelve la fila actualizada.
create or replace function public.fn_record_chess_result(p_challenger text, p_outcome text)
returns public.chess_trophies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.chess_trophies;
  v_is_win boolean := (p_outcome = 'win');
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;
  if p_challenger not in ('teo','vera','severo','aurelio','encapuchado') then
    raise exception 'retador invalido: %', p_challenger;
  end if;
  if p_outcome not in ('win','loss','draw') then
    raise exception 'resultado invalido: %', p_outcome;
  end if;

  insert into public.chess_trophies as t (user_id, challenger, wins, attempts, first_win_at, last_played_at)
  values (
    v_uid, p_challenger,
    case when v_is_win then 1 else 0 end,
    1,
    case when v_is_win then now() else null end,
    now()
  )
  on conflict (user_id, challenger) do update set
    wins = t.wins + (case when v_is_win then 1 else 0 end),
    attempts = t.attempts + 1,
    first_win_at = coalesce(t.first_win_at, case when v_is_win then now() else null end),
    last_played_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.fn_record_chess_result(text, text) from public, anon;
grant execute on function public.fn_record_chess_result(text, text) to authenticated;
