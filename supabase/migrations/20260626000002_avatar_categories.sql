-- ============================================================
-- DOMANI — Avatares por CATEGORÍA (precio por categoría, sin nombre por avatar)
-- ============================================================
-- Modelo definitivo del Mercado:
--   - El avatar NO tiene nombre propio (el alias nombra al avatar). Solo
--     pertenece a una CATEGORÍA y a un arquetipo interno de generación.
--   - El PRECIO lo define la CATEGORÍA (no cada avatar).
--   - Hay 10 avatares de BIENVENIDA (is_starter). Al registrarse, el usuario
--     escoge 1 GRATIS entre ellos (una sola vez). Después, todo se paga según
--     la categoría. Cambiar entre los que YA posee es gratis.
--   - Toda compra pasa por _credit_ledger (regla técnica suprema).
-- ============================================================

-- Categorías = niveles de precio. Más barata 1.500 · más cara 10.000.
create table if not exists avatar_categories (
  code       text primary key,
  label      text not null,
  price      bigint not null check (price >= 0),
  sort_order int not null default 0
);

insert into avatar_categories (code, label, price, sort_order) values
  ('esencial',  'Esencial',  1500,  0),
  ('selecta',   'Selecta',   3500,  1),
  ('prestigio', 'Prestigio', 6500,  2),
  ('legado',    'Legado',   10000,  3)
on conflict (code) do update set label = excluded.label, price = excluded.price, sort_order = excluded.sort_order;

alter table avatar_categories enable row level security;
drop policy if exists p_avatar_categories_read on avatar_categories;
create policy p_avatar_categories_read on avatar_categories for select using (true);

-- El avatar cuelga de una categoría; is_starter marca los 10 de bienvenida.
alter table avatars add column if not exists category text not null default 'esencial'
  references avatar_categories(code);
alter table avatars add column if not exists is_starter boolean not null default false;
create index if not exists idx_avatars_category on avatars(category);

-- Reclasificar la semilla anterior como los 10 avatares de BIENVENIDA
-- (categoría 'esencial'). Solo avatar-1 tiene arte real por ahora.
update avatars set category = 'esencial', is_starter = true where code in
  ('avatar-1','avatar-2','avatar-3','avatar-4','avatar-5','avatar-6','avatar-7','avatar-8','avatar-9');

insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order, category, is_starter)
values ('avatar-10', 'Bienvenida 10', 'ciudadano', '/assets/avatars/avatar-10.webp', false, 0, 9, 'esencial', true)
on conflict (code) do nothing;

-- ============================================================
-- RPC: set_avatar — equipar / adquirir. Precio por categoría.
--   1 gratis de bienvenida (primera vez, solo entre los starters).
-- ============================================================
create or replace function set_avatar(p_code text)
returns table (avatar_code text, cost bigint, balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_av        avatars;
  v_price     bigint;
  v_owned     boolean;
  v_used_free boolean;
  v_cost      bigint := 0;
  v_balance   bigint;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select * into v_av from avatars where code = p_code and is_active;
  if not found then
    raise exception 'avatar no disponible';
  end if;
  select c.price into v_price from avatar_categories c where c.code = v_av.category;

  v_owned := exists (select 1 from profile_avatars pa where pa.user_id = v_uid and pa.avatar_code = p_code);
  v_used_free := exists (select 1 from profile_avatars pa where pa.user_id = v_uid);

  if v_owned then
    v_cost := 0;                                       -- re-equipar lo propio
  elsif (not v_used_free) and v_av.is_starter then
    v_cost := 0;                                       -- avatar de bienvenida gratis (1 vez)
  else
    v_cost := coalesce(v_price, 0);                    -- precio de la categoría
  end if;

  if v_cost > 0 then
    select w.balance into v_balance from wallets w where w.user_id = v_uid;
    if coalesce(v_balance, 0) < v_cost then
      raise exception 'saldo insuficiente para este avatar';
    end if;
    perform _credit_ledger(
      v_uid, -v_cost, 'earned', 'avatar_buy',
      'avatar', null, jsonb_build_object('code', p_code, 'category', v_av.category)
    );
  end if;

  -- Toda ADQUISICIÓN (incluida la gratis de bienvenida) registra propiedad,
  -- así el cupo gratis se consume. Re-equipar lo propio no inserta nada.
  if not v_owned then
    insert into profile_avatars(user_id, avatar_code, price_paid)
    values (v_uid, p_code, v_cost)
    on conflict do nothing;
  end if;

  update profiles set avatar_code = p_code, updated_at = now() where id = v_uid;

  return query
    select p_code, v_cost, w.balance from wallets w where w.user_id = v_uid;
end;
$$;

revoke all on function set_avatar(text) from public, anon;
grant execute on function set_avatar(text) to authenticated;

-- ============================================================
-- RPC: avatar_market — catálogo por categoría para el usuario actual.
-- ============================================================
create or replace function avatar_market()
returns table (
  code text, image_path text, image_ready boolean, archetype text,
  category text, category_label text, category_price bigint, category_sort int,
  is_starter boolean, owned boolean, equipped boolean,
  effective_cost bigint, free_pick_available boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_equipped  text;
  v_used_free boolean;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select p.avatar_code into v_equipped from profiles p where p.id = v_uid;
  v_used_free := exists (select 1 from profile_avatars pa where pa.user_id = v_uid);

  return query
    select
      a.code, a.image_path, a.image_ready, a.archetype,
      a.category, c.label, c.price, c.sort_order,
      a.is_starter,
      (po.user_id is not null)                          as owned,
      (a.code = v_equipped)                             as equipped,
      case
        when po.user_id is not null then 0::bigint      -- ya lo posee
        when (not v_used_free) and a.is_starter then 0::bigint  -- bienvenida gratis
        else c.price
      end                                               as effective_cost,
      (not v_used_free)                                 as free_pick_available
    from avatars a
    join avatar_categories c on c.code = a.category
    left join profile_avatars po on po.avatar_code = a.code and po.user_id = v_uid
    where a.is_active
    order by c.sort_order, a.sort_order, a.code;
end;
$$;

revoke all on function avatar_market() from public, anon;
grant execute on function avatar_market() to authenticated;
