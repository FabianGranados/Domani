-- ============================================================
-- DOMANI — Motor de vida de los ciudadanos-bot + DDN News feed
-- ============================================================
-- Un "latido" (pg_cron, cada 5 min) hace que los bots jueguen entre ellos
-- (dinero en circuito cerrado con rake = sumidero), suban/bajen de Influencia,
-- y generen las NOTICIAS de DDN (feed_events). El feed alimenta el Escritorio.
-- ============================================================
create extension if not exists pg_cron;

create table if not exists bot_traits (
  user_id    uuid primary key references profiles(id) on delete cascade,
  archetype  text not null default 'ciudadano',
  risk       numeric not null default 0.5,
  skill      numeric not null default 0.5,
  chattiness numeric not null default 0.5,
  fav_game   text not null default 'póker'
);
insert into bot_traits (user_id, archetype, risk, skill, chattiness, fav_game)
select id,
  (array['tiburón','prudente','fanfarrón','novato','veterano','estratega'])[1+floor(random()*6)],
  round(random()::numeric, 2), round(random()::numeric, 2), round(random()::numeric, 2),
  (array['póker','ajedrez','blackjack','ruleta'])[1+floor(random()*4)]
from profiles where is_bot
on conflict (user_id) do nothing;

create table if not exists feed_events (
  id        uuid primary key default gen_random_uuid(),
  kind      text not null,
  city_id   uuid references houses(id),
  actor     uuid references profiles(id) on delete set null,
  headline  text not null,
  amount    bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_feed_created on feed_events(created_at desc);
alter table feed_events enable row level security;
drop policy if exists p_feed_read on feed_events;
create policy p_feed_read on feed_events for select using (true);

create or replace function sim_bot_tick() returns void
language plpgsql security definer set search_path = public
as $$
declare
  games  text[] := array['póker','ajedrez','blackjack','ruleta'];
  tw     text[] := array[
    '⟡%2$s · %1$s arrasó en una mesa de %3$s en %4$s.',
    '%1$s se levantó con ⟡%2$s jugando %3$s en %4$s.',
    'Noche redonda para %1$s: ⟡%2$s en %3$s (%4$s).',
    '%1$s domina las mesas de %3$s en %4$s: ⟡%2$s.'];
  big    text[] := array[
    '🔥 %1$s hizo saltar la banca: ⟡%2$s en %3$s de %4$s.',
    '💥 ⟡%2$s para %1$s en una jugada histórica de %3$s en %4$s.'];
  quips  text[] := array[
    'esta mesa está caliente esta noche','me retiro, mala racha','el que no arriesga, no gana',
    'hoy huele a fortuna','vine a ganar, no a mirar','la suerte respeta al valiente',
    'en %s se juega distinto','nadie me lee la cara'];
  cityev text[] := array[
    '📣 %s está de fiesta: bonos especiales hoy.','🌧️ Tormenta sobre %s: los ciudadanos se preparan.',
    '🏛️ Hacienda anuncia revisión de impuestos en %s.','🎉 %s celebra una noche récord en sus mesas.',
    '💼 Se mueve el dinero en %s: las mesas no descansan.'];
  h int; v_city uuid; v_cityname text; v_a uuid; v_aa text; v_ab bigint; v_b uuid; v_bb bigint;
  v_game text; v_stake bigint; v_amt bigint; v_kind text; v_head text;
begin
  for h in 1..8 loop
    select id, name into v_city, v_cityname from houses order by random() limit 1;
    select p.id, p.alias, w.balance into v_a, v_aa, v_ab from profiles p join wallets w on w.user_id=p.id
      where p.is_bot and p.house_id=v_city and w.balance > 3000 order by random() limit 1;
    if v_a is null then continue; end if;
    select p.id, w.balance into v_b, v_bb from profiles p join wallets w on w.user_id=p.id
      where p.is_bot and p.house_id=v_city and w.balance > 3000 and p.id<>v_a order by random() limit 1;
    if v_b is null then continue; end if;
    v_game := games[1+floor(random()*array_length(games,1))];
    v_stake := least((least(v_ab,v_bb)*0.08)::bigint, (500+floor(random()*6000))::bigint);
    if v_stake < 300 then continue; end if;
    perform _credit_ledger(v_b, -v_stake, 'earned','game_loss','bot_sim', v_city, jsonb_build_object('game',v_game));
    perform _credit_ledger(v_a, round(v_stake*0.9)::bigint, 'earned','game_win','bot_sim', v_city, jsonb_build_object('game',v_game));
    update profiles set influence = influence + (2+floor(random()*12))::int where id=v_a;
    update profiles set influence = greatest(0, influence - (1+floor(random()*4))::int) where id=v_b;
    v_amt := round(v_stake*0.9)::bigint;
    if v_amt >= 4500 then
      v_kind := 'big_win'; v_head := format(big[1+floor(random()*array_length(big,1))], v_aa, v_amt::text, v_game, v_cityname);
    else
      v_kind := 'game'; v_head := format(tw[1+floor(random()*array_length(tw,1))], v_aa, v_amt::text, v_game, v_cityname);
    end if;
    insert into feed_events(kind, city_id, actor, headline, amount) values (v_kind, v_city, v_a, v_head, v_amt);
  end loop;

  for h in 1..3 loop
    select p.alias, ho.name into v_aa, v_cityname from profiles p join houses ho on ho.id=p.house_id
      where p.is_bot order by random() limit 1;
    if v_aa is null then continue; end if;
    v_head := v_aa || ': «' || format(quips[1+floor(random()*array_length(quips,1))], v_cityname) || '».';
    insert into feed_events(kind, headline) values ('chatter', v_head);
  end loop;

  if random() < 0.5 then
    select name into v_cityname from houses order by random() limit 1;
    insert into feed_events(kind, headline) values ('city', format(cityev[1+floor(random()*array_length(cityev,1))], v_cityname));
  end if;

  delete from feed_events where created_at < now() - interval '3 days';
end;
$$;
revoke all on function sim_bot_tick() from public, anon, authenticated;

-- Latido cada 5 minutos.
select cron.unschedule('domani-bot-life') where exists (select 1 from cron.job where jobname='domani-bot-life');
select cron.schedule('domani-bot-life', '*/5 * * * *', 'select public.sim_bot_tick()');
