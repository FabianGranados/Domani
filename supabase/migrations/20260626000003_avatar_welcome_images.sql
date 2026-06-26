-- ============================================================
-- DOMANI — Arte real de los 10 avatares de BIENVENIDA
-- ============================================================
-- Las 10 fotos (recortadas/optimizadas a webp) ya viven en
-- apps/web/public/assets/avatars/avatar-N.webp. Marcamos su arte como listo
-- y unificamos la ruta a /assets/avatars/<code>.webp (incluido avatar-1, que
-- antes apuntaba a la ruta heredada).
-- ============================================================
update avatars
set image_path = '/assets/avatars/' || code || '.webp',
    image_ready = true
where code in
  ('avatar-1','avatar-2','avatar-3','avatar-4','avatar-5',
   'avatar-6','avatar-7','avatar-8','avatar-9','avatar-10');
