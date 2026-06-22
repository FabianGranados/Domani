# DOMANI — Especificación técnica para construcción (Claude Code)

> **Para el agente Code:** este documento es el plano para construir el MVP de DOMANI.
> El esquema de base de datos ya existe en el archivo `domani_schema.sql` (Supabase/PostgreSQL).
> Léelo primero. No reinventes el esquema; constrúyelo encima.

---

## 0. QUÉ ES DOMANI (en una línea)

Una sociedad de juego de ficción: club privado, elegante y competitivo donde los miembros
juegan, ganan **Aurelios** (moneda de fantasía), suben **Influencia** (reputación),
pertenecen a **Casas** y compiten bajo **El Círculo**. **Nada de dinero real dentro del juego.**

---

## 1. REGLAS INNEGOCIABLES (LEGAL — NO ROMPER NUNCA)

Estas reglas definen la viabilidad legal del producto (Colombia / Coljuegos, Ley 643 de 2001).
Si una funcionalidad nueva las rompe, **no se construye**.

1. **Los Aurelios JAMÁS se compran con dinero real.** En el MVP no existe compra de Aurelios.
   (El ledger tiene un bucket `purchased` reservado para el futuro, pero queda deshabilitado.)
2. **Los Aurelios JAMÁS se convierten a dinero / bienes / servicios reales.** No hay retiro. Imposible por diseño.
3. **Ninguna tabla, pantalla, formulario o API de juego maneja dinero real.** Solo Aurelios.
   No existe campo "entrada en pesos", "premio en pesos", ni ranking de dinero.
4. **El dinero real (membresías, fase futura) solo compra:** poder de crear torneos/mesas,
   estatus, estética. NUNCA Aurelios, NUNCA ventaja en el juego, NUNCA más fichas.
5. **Reponer Aurelios de azar se hace con azar gratis** (minijuegos de entrada gratuita que
   regalan Aurelios) o con la Renta Ciudadana. NUNCA cruzando valor desde juegos de destreza,
   NUNCA con dinero.
6. **Diseño responsable:** el producto debe DIFICULTAR el abuso (que alguien lo use para apostar
   dinero real por fuera), no solo prohibirlo en términos. Aurelios intransferibles libremente,
   cero campos de dinero, baneo de cuentas que intenten montar apuestas reales.
7. **+18:** confirmar mayoría de edad al registrarse (campo `age_confirmed`). Aviso legal visible.

> Estas 7 reglas van replicadas como comentario de cabecera en el `domani_schema.sql`.

---

## 2. STACK TÉCNICO

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **Cloudflare Pages** + framework SPA (Next.js o React + Vite) | Estático/edge, escala solo |
| Edge logic | **Cloudflare Workers** | Lógica sensible cerca del usuario |
| Backend / DB | **Supabase** (PostgreSQL + Auth + RLS + Realtime) | Esquema ya definido |
| Auth | Supabase Auth: **correo+clave y Google OAuth** | +18 obligatorio |
| Tiempo real | **Supabase Realtime** (canales por mesa/lobby) | Multijugador y lobby "vivo" |
| Lógica económica | **Postgres functions + Edge Functions** con `service_role` | Único camino para mover Aurelios |

**Por qué este stack:** Cloudflare + Supabase escalan de 10 a 100.000+ usuarios sin rearquitectura.
La clave de escalabilidad no es la herramienta sino el diseño: índices correctos, RLS, y que
**todo movimiento de Aurelios pase por el ledger** (nunca UPDATE directo de saldo).

---

## 3. PRINCIPIO ARQUITECTÓNICO CENTRAL: EL LEDGER

Ningún saldo de Aurelios se modifica directamente. **Todo** ingreso/egreso es una fila en
`ledger_transactions`. El saldo cacheado en `wallets` lo actualiza un trigger.

- Ganar en La Academia → insert ledger (`reason='academy_reward'`, `amount=+X`).
- Entrar a una mesa con buy-in → insert ledger (`reason='game_buyin'`, `amount=-X`).
- Ganar una mano → insert ledger (`reason='game_win'`, `amount=+X`).

Beneficios: auditable, reversible, antifraude, y hace **imposible** "inventar" Aurelios sin rastro.
Las inserciones al ledger SOLO las hace el backend con `service_role` (RLS bloquea al cliente).

---

## 4. MVP 1 — ALCANCE A CONSTRUIR PRIMERO

Construir EN ESTE ORDEN (cada uno funcional antes del siguiente):

1. **Auth** (correo + Google) + confirmación +18 + creación de `profile` y `wallet` vacíos.
2. **Elección de Casa** (1 de las 6 sembradas) → crea `house_membership`.
3. **Tessera** (pantalla de credencial: alias, Casa, rango, Influencia, Aurelios).
4. **Wallet + Ledger** funcionando (mostrar saldo, historial de movimientos).
5. **Renta Ciudadana** (asignación diaria que se reclama tras una acción; 1 vez/día por `renta_claims`).
6. **La Academia** (responder preguntas → recompensa vía ledger + influence_events).
7. **Un juego jugable**: empezar por **un minijuego de azar de entrada gratuita** que regala
   Aurelios (cierra el ciclo legal de "reponer azar con azar gratis"). Sugerencia: ruleta simple
   single-player contra la banca, buy-in 0, premio en Aurelios.
8. **Lobby "vivo"** con jugadores IA (ver sección 6).

**Fase 2 (no ahora):** Propiedades, Mercado Domani, impuestos/Hacienda, disputas de Orbes,
torneos creados por usuarios, membresías de pago, multijugador real de póker.

---

## 5. EXTENSIBILIDAD: "AGREGAR UN JUEGO SIN ROMPER NADA"

Requisito explícito del dueño. El diseño lo soporta así:

- Todo juego es una fila en `games` con su `family` (`skill` | `chance`).
- Una partida es una `game_session`; los participantes, `game_entries`; los resultados, `game_results`.
- **El motor económico no sabe de reglas de cada juego.** Cualquier juego nuevo solo necesita:
  (a) su fila en `games`, (b) su lógica de cliente/worker, (c) reportar resultados al ledger
  vía la misma función `settle_session()`.
- Por tanto, agregar Blackjack, Damas, etc. = nuevo módulo de juego que reusa el mismo núcleo.
  **Nunca se toca el ledger ni el wallet.** Eso protege el código del dueño de romperse.

Implementar una **interfaz/contrato `GameModule`** común:
`createSession()`, `join()`, `playTurn()`, `resolve() -> resultados[]`. El core llama `settle()`.

---

## 6. JUGADORES IA (LOBBY VIVO — "que se sienta lleno")

Requisito: aunque haya 1 humano, debe sentirse poblado (~2.000 jugadores aparentes).

Enfoque por capas (de lo más simple a lo más realista):

- **Capa 1 (presencia):** sembrar perfiles `is_bot=true` con alias naturales (generador de nicks
  por Casa/cultura), rangos e Influencia variados. Pueblan rankings, lobby y listas de mesas.
- **Capa 2 (actividad simulada):** un Worker programado (cron) que mueve métricas de bots de forma
  verosímil: entran/salen de salones, suben Influencia, aparecen en "actividad reciente".
- **Capa 3 (juego real contra bots):** para juegos single-player vs banca, el "rival" es lógica
  del servidor. Para mesas multijugador, los asientos vacíos pueden ocuparse con bots con
  **patrones de comportamiento** (tiempos de respuesta variables, estilos de juego distintos:
  agresivo/conservador/tramposo-bluff) para que se sientan humanos.

**Regla:** los bots operan en Aurelios igual que todos; nunca tocan dinero real. Marcar SIEMPRE
`is_bot=true` internamente (transparencia para auditoría), aunque al usuario no se le muestre.

Generador de alias: combinar listas temáticas por Casa (ej. Bacatá → andino/frío;
Plata → porteño/tango; Osaka → japonés/preciso) + sufijos numéricos. Evitar nombres reales de personas.

---

## 7. SEGURIDAD / RLS (ya en el esquema)

- RLS activado: cada usuario ve/edita solo lo suyo; catálogos (casas, juegos, preguntas) son públicos en lectura.
- El cliente **no puede** insertar en `ledger_transactions` ni en `wallets` (solo `service_role`).
- Toda mutación económica pasa por Edge Functions / RPC con validación server-side.
- `audit_logs` y `risk_flags` para trazabilidad y antifraude desde el día 1.

---

## 8. ESTRUCTURA DE CARPETAS SUGERIDA

```
domani/
├── apps/
│   ├── web/                 # Cloudflare Pages (frontend)
│   └── workers/             # Cloudflare Workers (edge logic, cron de bots)
├── supabase/
│   ├── migrations/          # domani_schema.sql va aquí
│   └── functions/           # Edge Functions (settle_session, claim_renta, etc.)
├── packages/
│   ├── game-core/           # contrato GameModule + settle()
│   └── games/               # un módulo por juego (poker/, roulette/, chess/...)
└── DOMANI_BUILD_CODE.md
```

---

## 9. ORDEN DE TRABAJO PARA EL AGENTE

1. Conectar al proyecto Supabase y aplicar `domani_schema.sql`.
2. Configurar Supabase Auth (correo + Google) + flag +18.
3. Frontend base en Cloudflare Pages con la identidad visual (ver `DOMANI_DESIGN.md`).
4. Implementar el ciclo MVP en el orden de la sección 4.
5. Implementar `game-core` + el primer juego (ruleta gratis).
6. Sembrar bots y lobby vivo.
7. Dejar hooks de membresía listos (sin cobro aún).

> Recordatorio final: ante cualquier feature nueva, revisar las 7 reglas de la sección 1.
> Si la feature implica que el dinero real toque Aurelios o el juego, **se detiene y se consulta.**
