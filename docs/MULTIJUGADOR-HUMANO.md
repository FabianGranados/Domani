# Domani — Multijugador humano (invitar, retar, jugar en vivo)

> Sistema **genérico** para que dos humanos jueguen en tiempo real. Primero en
> **ajedrez** (implementado, Fase 1). La MISMA lógica se reusará en **póker** y
> los demás juegos: solo cambia la "mesa/partida" y las reglas; la capa de
> invitación + emparejamiento + tiempo real es compartida.

---

## 1. Principios
- **Invitar debe ser tan fácil como mandar un link por WhatsApp.** Nada de saber
  correos de memoria. El enlace es el héroe.
- **Tiempo real** sobre **Supabase Realtime** (postgres_changes con RLS). Cada
  quien solo ve sus partidas/mensajes.
- **Toda mutación pasa por RPCs `security definer`** (jamás UPDATE directo del
  cliente). RLS solo permite SELECT de lo propio.
- **El enlace lleva un id de partida no adivinable (UUID).** Quien tiene el link,
  entra. Eso es la invitación.

## 2. Modelo de datos (ajedrez) — patrón reutilizable
Tabla `chess_matches` (el patrón vale para `poker_tables`, etc.):
- `id uuid` (va en el enlace), `white_id`, `black_id` (null mientras se espera),
- `status` ('waiting' | 'active' | 'finished' | 'aborted'),
- `kind` ('direct' = reto a alguien · 'quick' = cola al azar · 'link' = invitación por enlace),
- estado del juego: `fen`, `turn`, `last_move`, `winner_id`, `result`,
- `created_at`, `updated_at`.
- **RLS:** SELECT solo si eres `white_id` o `black_id`. Sin INSERT/UPDATE directo.
- **Realtime:** tabla en `supabase_realtime`, `replica identity full`.

## 3. RPCs (la "API" del multijugador) — server-side
- `chess_create_link()` → crea partida `kind='link'`, `waiting`, tú=blancas. Devuelve la fila (de ahí sale el enlace).
- `chess_join_link(match)` → te une como negras si está libre; **idempotente** (si ya eres parte, devuelve la partida). Quien tenga el link entra.
- `chess_quick_match()` → cola al azar: te empareja con otro `kind='quick'` que espere, o te deja esperando.
- `chess_challenge(opponent)` → reto directo `kind='direct'` a un id conocido (de `find_user`).
- `chess_accept(match)` → el retado (negras) acepta → `active`.
- `chess_move(match, fen, turn, last, finished, winner, result)` → valida que sea tu turno y sincroniza la posición.
- `chess_resign(match)`.
- `chess_my_games()` → partidas activas + retos pendientes (al abrir la pantalla).
- `chess_recent_opponents()` → para revanchas rápidas.
- `find_user(query)` → busca humano por correo/alias/código (no expone correos ajenos).

## 4. Cliente (React) — piezas
- `src/lib/api.ts`: wrappers de los RPC + suscripciones realtime:
  - `subscribeMatch(id, cb)` → cambios de UNA partida (jugadas, estado).
  - `subscribeChallenges(myId, cb)` → INSERT de retos donde eres negras (retos entrantes).
  - `subscribeDM(...)` → mensajería directa (mismo patrón, otra tabla).
- `src/components/ChessPieces.tsx`: piezas SVG (set Cburnett). **No usar símbolos
  Unicode de ajedrez** → iOS Safari los pinta como emoji e ignora el color.
- Pantallas:
  - `AjedrezSalonScreen` (`/ajedrez`): hub con 3 botones (con un amigo / vs máquina / palmarés).
  - `AjedrezOnlineScreen` (`/ajedrez-online`): "Jugar con un amigo" + el tablero en vivo.
  - `AjedrezScreen` (`/ajedrez/maquina`): vs bots (lo de siempre).

## 5. Flujos (Fase 1, implementado)
**Invitar por enlace (héroe):**
1. "⚡ Retar a un amigo" → `chess_create_link()` → URL `…/ajedrez-online?j=<matchId>`.
2. Se abre el menú de compartir del teléfono (`navigator.share`, si no, copia al portapapeles) con el mensaje listo para WhatsApp.
3. Tú quedas en "Esperando a tu amigo…" (suscrito a la partida) con **Compartir de nuevo** y **Cancelar**.
4. El amigo abre el enlace → `?j=` → `chess_join_link()` → `active` → ambos al tablero. Tu suscripción dispara y arranca.

**Jugar ya:** `chess_quick_match()` (cola al azar).
**Reto directo / revancha:** `find_user` o `chess_recent_opponents` → `chess_challenge` → al retado le llega por `subscribeChallenges` (sección "Te retaron" → Aceptar). Al abrir la pantalla también se cargan los retos pendientes (`chess_my_games`).

**Tablero en vivo:** chess.js valida la jugada en el cliente → `chess_move` sincroniza → el rival la recibe por `subscribeMatch` y aplica el nuevo FEN. Orientación según tu color; resaltado de última jugada; rendirse; mate/tablas.

## 6. Pendiente (Fases 2 y 3)
- **Fase 2 — enlace para NO registrados:** si el amigo no tiene cuenta, el enlace
  lo lleva a un registro express que **recuerda la partida** y lo mete a ella al
  terminar. (Guardar `?j=` antes del onboarding y consumirlo después.)
- **Fase 3 — social:**
  - **En línea ahora** (presencia con Supabase Realtime Presence).
  - **Notificación global** de retos en cualquier pantalla (suscripción a nivel
    app + banner), no solo dentro de ajedrez.
  - Retar **desde el chat** (botón "♟️ Retar" en una conversación de Mensajes).

## 7. Cómo se reusa en PÓKER y otros
El patrón es idéntico; cambia la entidad y las reglas:
- Tabla `poker_tables` (o reusar partidas) con `kind` ('link'/'quick'/'direct'),
  estado del juego propio del póker (manos, board, turnos, stacks), RLS por
  participantes, realtime.
- Mismos RPCs análogos: `poker_create_link`, `poker_join_link`, `poker_quick_match`…
- Misma UI: hero "invitar por enlace", "jugar ya", recientes, retos.
- **Reutilizable tal cual:** `find_user`, el patrón de enlace `?j=<id>`,
  `subscribeMatch`/`subscribeChallenges`, el set de piezas/cartas, y la idea de
  "esperando + compartir de nuevo + cancelar".
- Cuando lleguemos a póker humano: extraer un helper genérico de "salas"
  (`createLink/join/quick/challenge/accept/subscribe`) parametrizado por juego.

## 8. Decisiones tomadas
- Invitar = **enlace (WhatsApp) + lista** (recientes / buscar por alias / retos).
- El enlace debe servir para **no registrados** (Fase 2).
- Todo el ajedrez vive en un **Salón simple** (`/ajedrez`, 3 botones).
- Piezas **SVG** (nunca Unicode) por el bug de emoji en iOS.
