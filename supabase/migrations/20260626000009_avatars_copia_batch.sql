-- ============================================================
-- DOMANI — 97 avatares adicionales (avatar-150 .. avatar-246)
-- ============================================================
-- Estaban en carpetas llamadas "copia" pero resultaron ser ÚNICOS (no
-- duplicados). Recortados/optimizados a webp y repartidos en los 3 tiers de
-- precio para dar variedad (los tiers son niveles de precio, sin etiqueta de tema).
-- ============================================================
insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order, category, is_starter)
select 'avatar-'||n, 'av-'||n, 'figura', '/assets/avatars/avatar-'||n||'.webp', true, 0, 10+n,
  case when n % 6 = 0 then 'legado' when n % 3 = 2 then 'selecta' else 'esencial' end, false
from generate_series(150,246) as n
on conflict (code) do update
  set image_ready=true, image_path=excluded.image_path, category=excluded.category, sort_order=excluded.sort_order;
