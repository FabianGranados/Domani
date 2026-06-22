-- ============================================================
-- DOMANI — 7 Casas (alineado con el diseño)
-- Renombra Lexington -> Empire (NY) y agrega Aztlán (CDMX).
-- ============================================================

update houses
set code = 'empire',
    name = 'Casa Empire',
    city = 'Nueva York',
    motto = 'El imperio no espera: se construye.',
    specialty = 'blackjack, mercado, torneos rápidos',
    color_primary = '#6c7a88'
where code = 'lexington';

insert into houses (code, name, city, motto, color_primary, specialty)
values ('aztlan','Casa Aztlán','Ciudad de México','La serpiente recuerda a quien asciende.','#1c8a9a','estrategia, juegos rápidos')
on conflict (code) do nothing;
