# DOMANI

Sociedad de juego de ficción: club privado y competitivo donde los miembros juegan,
ganan **Aurelios** (moneda de fantasía), suben **Influencia**, pertenecen a **Casas** y
compiten bajo **El Círculo**. **Cero dinero real dentro del juego.**

> Lee primero `DOMANI_BUILD_CODE.md` (el plano del MVP) y las **7 reglas legales
> innegociables** que viven en la cabecera de `supabase/domani_schema.sql`.

## Monorepo

```
domani/
├── apps/
│   ├── web/         # Frontend React + Vite (Cloudflare Pages)
│   └── workers/     # Cloudflare Workers: cron de bots (lobby vivo) + seed
├── packages/
│   ├── game-core/   # Contrato GameModule + settle (núcleo económico-agnóstico)
│   └── games/
│       └── roulette/  # Primer juego: ruleta europea
├── supabase/
│   ├── migrations/  # Esquema + funciones económicas (aplicadas al proyecto)
│   └── functions/   # (Edge Functions, Fase 2)
└── DOMANI_BUILD_CODE.md
```

## Arquitectura central: el LEDGER

Ningún saldo de Aurelios se modifica directo. **Todo** ingreso/egreso es una fila en
`ledger_transactions`; un trigger recalcula el saldo cacheado en `wallets`. Las
inserciones al ledger solo las hacen funciones `SECURITY DEFINER` en Postgres
(equivalente a `service_role`); RLS bloquea al cliente.

Funciones server-side (en `supabase/migrations/..._economy_functions.sql`):

| Función | Quién la llama | Qué hace |
|---|---|---|
| `bootstrap_profile(alias, +18)` | usuario | crea profile + wallet + tessera |
| `choose_house(code)` | usuario | une a una de las 6 Casas |
| `claim_renta(action)` | usuario | Renta Ciudadana diaria (1/día) |
| `answer_academy_question(q, i)` | usuario | corrige y premia (1ª vez) |
| `spin_roulette_free(type, value)` | usuario | giro gratis, RNG server-side |
| `settle_session(session, results)` | **service_role** | liquidación genérica de juegos |

`settle_session` acepta deltas arbitrarios, por eso **solo** `service_role` puede
ejecutarla (el Worker/Edge la usa tras validar las reglas del juego). El resto calcula
el resultado en el servidor, así que el cliente nunca puede inventar Aurelios.

## Puesta en marcha

```bash
pnpm install

# Frontend (necesita apps/web/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
pnpm dev

# Sembrar bots del lobby (requiere service_role)
cd apps/workers
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed:bots 200
```

Copia `.env.example` para ver las variables. El proyecto Supabase ya tiene el esquema y
las funciones aplicadas.

## Estado (MVP 1)

- [x] Esquema + funciones económicas (Supabase)
- [x] Auth (correo + Google) + confirmación +18
- [x] Onboarding (alias) → profile + wallet
- [x] Elección de Casa
- [x] Tessera (credencial)
- [x] Wallet + Ledger (saldo + historial)
- [x] Renta Ciudadana
- [x] La Academia
- [x] Ruleta gratis (cierra el ciclo legal "azar con azar gratis")
- [x] Lobby + contrato `GameModule` + worker de bots
- [ ] Identidad visual final (`DOMANI_DESIGN.md`)

## Reglas legales (no romper jamás)

Producto alineado a Colombia / Coljuegos (Ley 643 de 2001). Los Aurelios **no se compran
ni se canjean** por dinero real; ninguna tabla/pantalla maneja dinero real; +18 obligatorio.
Ante cualquier feature que haga que el dinero real toque Aurelios o el juego: **se detiene
y se consulta.**
