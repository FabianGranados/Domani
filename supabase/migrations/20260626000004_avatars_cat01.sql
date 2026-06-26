-- ============================================================
-- DOMANI — Lote de avatares "categorías 01" (avatar-11 .. avatar-21)
-- ============================================================
-- 11 avatares temáticos recortados a webp (assets/avatars/avatar-N.webp).
-- Asignación de categoría PROVISIONAL ('selecta'): se reubican cuando se
-- defina la repartición final por tier.
-- ============================================================
insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order, category, is_starter)
select 'avatar-' || n, 'cat01-' || n, 'mascota',
       '/assets/avatars/avatar-' || n || '.webp', true, 0, 10 + n, 'selecta', false
from generate_series(11, 21) as n
on conflict (code) do update
  set image_ready = true,
      image_path  = excluded.image_path,
      category    = excluded.category;
