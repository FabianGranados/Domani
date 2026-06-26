-- ============================================================
-- DOMANI — Sala de Control (admin) + configuración en vivo
-- ============================================================
-- El dueño administra sin tocar código: parámetros en app_config que las
-- funciones de economía leen EN VIVO; RPCs de admin auditadas; rol is_admin.
-- ============================================================
alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
drop policy if exists p_app_config_read on app_config;
create policy p_app_config_read on app_config for select using (true);

insert into app_config (key, value) values
  ('bot_enabled', 'true'::jsonb),
  ('bot_tick_hands', '8'::jsonb),
  ('bot_rake_pct', '0.10'::jsonb),
  ('mudanza_base_pct', '0.10'::jsonb),
  ('mudanza_step_pct', '0.05'::jsonb),
  ('mudanza_cap_pct', '0.30'::jsonb),
  ('mudanza_min_fee', '5000'::jsonb),
  ('mudanza_cooldown_days', '30'::jsonb),
  ('renta_min_pct', '0.03'::jsonb),
  ('renta_max_pct', '0.06'::jsonb),
  ('game_play_cap_pct', '0.10'::jsonb)
on conflict (key) do nothing;

create table if not exists admin_audit (
  id       uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action   text not null,
  detail   jsonb,
  at       timestamptz not null default now()
);
alter table admin_audit enable row level security;

create or replace function cfg_num(p_key text, p_def numeric) returns numeric language sql stable security definer set search_path=public as $$
  select coalesce((select (value#>>'{}')::numeric from app_config where key=p_key), p_def);
$$;
create or replace function cfg_int(p_key text, p_def int) returns int language sql stable security definer set search_path=public as $$
  select coalesce((select (value#>>'{}')::int from app_config where key=p_key), p_def);
$$;
create or replace function cfg_bool(p_key text, p_def boolean) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select (value#>>'{}')::boolean from app_config where key=p_key), p_def);
$$;
create or replace function _is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

update profiles set is_admin = true
where id = (select id from auth.users where email = 'djfabiangranados@gmail.com' limit 1);

create or replace function admin_set_config(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not _is_admin() then raise exception 'no autorizado'; end if;
  insert into app_config(key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into admin_audit(admin_id, action, detail) values (auth.uid(), 'set_config', jsonb_build_object('key',p_key,'value',p_value));
end;
$$;
revoke all on function admin_set_config(text,jsonb) from public, anon;
grant execute on function admin_set_config(text,jsonb) to authenticated;

create or replace function admin_post_news(p_headline text, p_kind text default 'city') returns void
language plpgsql security definer set search_path=public as $$
begin
  if not _is_admin() then raise exception 'no autorizado'; end if;
  insert into feed_events(kind, headline) values (coalesce(p_kind,'city'), p_headline);
  insert into admin_audit(admin_id, action, detail) values (auth.uid(), 'post_news', jsonb_build_object('headline',p_headline,'kind',p_kind));
end;
$$;
revoke all on function admin_post_news(text,text) from public, anon;
grant execute on function admin_post_news(text,text) to authenticated;

create or replace function admin_run_bot_tick() returns void
language plpgsql security definer set search_path=public as $$
begin
  if not _is_admin() then raise exception 'no autorizado'; end if;
  perform sim_bot_tick();
  insert into admin_audit(admin_id, action) values (auth.uid(), 'run_bot_tick');
end;
$$;
revoke all on function admin_run_bot_tick() from public, anon;
grant execute on function admin_run_bot_tick() to authenticated;

create or replace function admin_metrics() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if not _is_admin() then raise exception 'no autorizado'; end if;
  select jsonb_build_object(
    'humanos', (select count(*) from profiles where not is_bot),
    'bots', (select count(*) from profiles where is_bot),
    'circulante', (select coalesce(sum(balance),0) from wallets),
    'noticias_24h', (select count(*) from feed_events where created_at > now() - interval '24 hours'),
    'mudanzas', (select count(*) from city_moves),
    'avatares', (select count(*) from avatars where is_active)
  ) into r;
  return r;
end;
$$;
revoke all on function admin_metrics() from public, anon;
grant execute on function admin_metrics() to authenticated;

-- sim_bot_tick y _mudanza_calc ahora LEEN la config en vivo (perillas del panel)
-- (cuerpos idénticos a los aplicados; ver 20260626000008 / 20260626000007).
