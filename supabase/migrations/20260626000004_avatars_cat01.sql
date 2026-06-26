-- ============================================================
-- DOMANI — Lote de avatares de pago (avatar-11 .. avatar-119)
-- ============================================================
-- 109 avatares únicos (deduplicados: se descartaron 21 copias byte-idénticas
-- que venían repetidas entre carpetas), recortados/optimizados a webp en
-- assets/avatars/avatar-N.webp.
-- Categoría PROVISIONAL ('selecta'): se reubican por tier cuando se defina la
-- repartición de precios definitiva.
-- ============================================================
insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order, category, is_starter)
select 'avatar-' || n, 'av-' || n, 'figura',
       '/assets/avatars/avatar-' || n || '.webp', true, 0, 10 + n, 'selecta', false
from generate_series(11, 119) as n
on conflict (code) do update
  set image_ready = true,
      image_path  = excluded.image_path,
      sort_order  = excluded.sort_order;
