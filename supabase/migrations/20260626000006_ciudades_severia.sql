-- ============================================================
-- DOMANI — Las Casas se vuelven CIUDADES + nueva ciudad Severia (ajedrez)
-- ============================================================
-- - Nombres reales ocultos: el campo `city` pasa a ser una REGIÓN de fantasía
--   (nunca una ciudad real). El nombre visible es el de fantasía.
-- - Especialidades mapeadas a juegos (identidad por ciudad).
-- - Osaka→Edoria, Roma→Imperia (eran nombres de ciudades reales).
-- - Nueva ciudad SEVERIA: capital del ajedrez.
-- ============================================================
update houses set name='Bacatá',     city='Altiplano',       specialty='Damas chinas · inmobiliaria'   where code='bacata';
update houses set name='Aztlán',     city='Valle Serpiente', specialty='Juegos rápidos · estrategia'   where code='aztlan';
update houses set name='Empire',     city='La Gran Bahía',   specialty='Texas Hold''em · Blackjack'    where code='empire';
update houses set name='Morro Alto', city='Bahía del Morro', specialty='Texas Hold''em · dominó'       where code='morro';
update houses set name='Plata',      city='El Estuario',     specialty='Póker mental'                  where code='plata';
update houses set name='Imperia',    city='Siete Colinas',   specialty='Ruleta',
                  motto='Imperia no apuesta. Imperia decide.'                                          where code='roma';
update houses set name='Edoria',     city='Archipiélago',    specialty='Estrategia · precisión'        where code='osaka';

insert into houses (id, code, name, city, motto, specialty, color_primary)
values (gen_random_uuid(), 'severia', 'Severia', 'Estepa Helada',
        'En Severia, una pieza decide una vida.', 'Ajedrez · maestros', '#4a6b8a')
on conflict (code) do update
  set name=excluded.name, city=excluded.city, motto=excluded.motto,
      specialty=excluded.specialty, color_primary=excluded.color_primary;
