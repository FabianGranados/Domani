-- ============================================================
-- DOMANI — Catálogo completo de avatares + 3 tiers de precio
-- ============================================================
-- 149 avatares únicos (10 de bienvenida + 139 de pago), deduplicados por
-- contenido y excluyendo las carpetas "copia". Se colapsa el Mercado a
-- TRES precios y se clasifican los de pago por tema:
--   Esencial ⟡1.500  = humanos (base)
--   Selecta  ⟡5.000  = aliens / criaturas (novedad)
--   Legado   ⟡10.000 = animales de lujo (estrella)
-- ============================================================

-- 1) Tres tiers de precio (se elimina 'prestigio').
update avatar_categories set price=1500,  label='Esencial', sort_order=0 where code='esencial';
update avatar_categories set price=5000,  label='Selecta',  sort_order=1 where code='selecta';
update avatar_categories set price=10000, label='Legado',   sort_order=2 where code='legado';
update avatars set category='selecta' where category='prestigio';
delete from avatar_categories where code='prestigio';

-- 2) Filas avatar-11..149 (arte listo).
insert into avatars (code, name, archetype, image_path, image_ready, price, sort_order, category, is_starter)
select 'avatar-'||n, 'av-'||n, 'figura', '/assets/avatars/avatar-'||n||'.webp', true, 0, 10+n, 'esencial', false
from generate_series(11,149) as n
on conflict (code) do update set image_ready=true, image_path=excluded.image_path, sort_order=excluded.sort_order;

-- 3) Clasificación por tema (criterio editorial; reubicable por código).
update avatars set category='legado' where code in (
 'avatar-11','avatar-12','avatar-13','avatar-14','avatar-15','avatar-16','avatar-17','avatar-18','avatar-19','avatar-20','avatar-21',
 'avatar-24','avatar-26','avatar-28','avatar-29','avatar-30','avatar-39','avatar-40',
 'avatar-59','avatar-60','avatar-61','avatar-62','avatar-63','avatar-64','avatar-65','avatar-66','avatar-67',
 'avatar-71','avatar-72','avatar-73','avatar-74','avatar-76','avatar-79','avatar-80',
 'avatar-90','avatar-92','avatar-93','avatar-95','avatar-96','avatar-97','avatar-98',
 'avatar-102','avatar-105','avatar-106','avatar-107','avatar-108','avatar-109','avatar-118');

update avatars set category='selecta' where code in (
 'avatar-25','avatar-27','avatar-50','avatar-51','avatar-52','avatar-53','avatar-54','avatar-55','avatar-56','avatar-57',
 'avatar-68','avatar-69','avatar-81','avatar-83','avatar-84','avatar-85','avatar-86','avatar-87','avatar-88','avatar-89','avatar-91','avatar-94');

update avatars set category='esencial' where is_starter=false and code not in (
 'avatar-11','avatar-12','avatar-13','avatar-14','avatar-15','avatar-16','avatar-17','avatar-18','avatar-19','avatar-20','avatar-21',
 'avatar-24','avatar-26','avatar-28','avatar-29','avatar-30','avatar-39','avatar-40',
 'avatar-59','avatar-60','avatar-61','avatar-62','avatar-63','avatar-64','avatar-65','avatar-66','avatar-67',
 'avatar-71','avatar-72','avatar-73','avatar-74','avatar-76','avatar-79','avatar-80',
 'avatar-90','avatar-92','avatar-93','avatar-95','avatar-96','avatar-97','avatar-98',
 'avatar-102','avatar-105','avatar-106','avatar-107','avatar-108','avatar-109','avatar-118',
 'avatar-25','avatar-27','avatar-50','avatar-51','avatar-52','avatar-53','avatar-54','avatar-55','avatar-56','avatar-57',
 'avatar-68','avatar-69','avatar-81','avatar-83','avatar-84','avatar-85','avatar-86','avatar-87','avatar-88','avatar-89','avatar-91','avatar-94');
