# Avatares — carpeta temporal de subida

Esta carpeta y esta rama (`avatares-raw`) son **temporales**. Sirven solo para
que subas las fotos originales (pesadas) de los avatares. Después de
convertirlas, esta rama se **borra** para no inflar el repositorio.

## Cómo subir tus fotos (desde la web de GitHub)

1. Asegúrate de estar en la rama **`avatares-raw`** (selector de ramas arriba a
   la izquierda en GitHub).
2. Entra a esta carpeta `avatares-raw/`.
3. Botón **Add file → Upload files**.
4. Arrastra tus fotos (PNG/JPG tal cual, no hace falta convertir nada).
   - Sube en **tandas** si son muchas (p. ej. 30–40 por tanda).
   - Ideal: tus **favoritas** (~30–40), no las 100+.
5. **Commit** los cambios en `avatares-raw`.
6. Avísame: "ya subí las fotos a avatares-raw".

## Qué hago yo después

1. Convierto todas a `webp` ligeras (recorte cuadrado, ~512px, fondo plano
   detrás de las transparentes).
2. Las reparto por categoría (Esencial ⟡1.500 · Selecta ⟡3.500 ·
   Prestigio ⟡6.500 · Legado ⟡10.000) y marco las 10 de bienvenida.
3. Subo **solo las livianas** a `main` (en `apps/web/public/assets/avatars/`).
4. **Borro** esta rama temporal.

> Nota: no subas nada importante aquí pensando que se queda — esta rama
> desaparece. Es solo el "puente" para pasarme las imágenes.
