-- Ajedrez humano vs humano en tiempo real (chess_matches + RPCs).
-- (Aplicada vía MCP; este archivo es el registro. Ver RPCs chess_quick_match,
--  chess_challenge, chess_accept, chess_move, chess_resign, chess_my_games.)
create table if not exists public.chess_matches (
  id uuid primary key default gen_random_uuid(),
  white_id uuid not null references auth.users(id) on delete cascade,
  black_id uuid references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','active','finished','aborted')),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn text not null default 'w' check (turn in ('w','b')),
  last_move text, winner_id uuid, result text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.chess_matches enable row level security;
create policy chess_m_select on public.chess_matches for select using (auth.uid()=white_id or auth.uid()=black_id);
grant select on public.chess_matches to authenticated;
alter table public.chess_matches replica identity full;
alter publication supabase_realtime add table public.chess_matches;
