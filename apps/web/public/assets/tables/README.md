# Paños de mesa por Casa

Cada Casa (casino) puede tener su propio paño de mesa de póker.

## Convención de nombres

- Un archivo por Casa, nombrado por su **código** de Casa: `<código>.webp`
  (ej. `bacata.webp`, `empire.webp`, `plata.webp`, `morro.webp`,
  `roma.webp`, `osaka.webp`, `aztlan.webp`).
- El código de la Casa es el mismo que devuelve `listHouses()` (`house.code`).

## Especificación de la imagen

- Formato: **WebP**, horizontal (landscape), proporción ~`1040 / 640`.
- Centro **calmado**: las cartas comunitarias, el bote y las fichas se dibujan
  encima del centro del paño; evita detalles muy contrastados o brillantes ahí
  para no perjudicar la lectura.
- Mantén la estética DOMANI (sobrio, elegante).

## Respaldo (fallback)

Si para una Casa no existe `<código>.webp`, el juego usa automáticamente el
paño por defecto `/assets/poker-table.webp` (vía `onError` del `<img>`). Por
eso una Casa nueva "funciona" con solo soltar aquí su `<código>.webp`.
