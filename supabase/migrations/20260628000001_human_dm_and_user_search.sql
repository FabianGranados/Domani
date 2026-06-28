-- Búsqueda de usuario por correo/alias/código + mensajería directa (DM) realtime.
-- (Aplicada vía MCP; este archivo es el registro.)
create or replace function public.find_user(p_query text)
returns table(id uuid, alias text, avatar_code text)
language sql security definer set search_path = public as $$
  select p.id, p.alias, p.avatar_code from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(p.is_bot,false)=false and p.id <> auth.uid()
    and (lower(u.email)=lower(trim(p_query)) or lower(p.alias)=lower(trim(p_query)) or left(p.id::text,8)=lower(trim(p_query)))
  limit 5;
$$;
revoke all on function public.find_user(text) from public, anon;
grant execute on function public.find_user(text) to authenticated;

create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.dm_messages enable row level security;
create policy dm_select_own on public.dm_messages for select using (auth.uid()=sender_id or auth.uid()=recipient_id);
create policy dm_insert_own on public.dm_messages for insert with check (auth.uid()=sender_id and sender_id<>recipient_id);
grant select, insert on public.dm_messages to authenticated;
alter table public.dm_messages replica identity full;
alter publication supabase_realtime add table public.dm_messages;
