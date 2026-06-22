# Despliegue de DOMANI

## Modelo de ramas

| Rama | Rol | URL |
|---|---|---|
| `main` | **Producción** | https://domani.club |
| `dev` | **Preview / revisión** | URL automática `dev.domani-web.pages.dev` |
| `claude/*` o features | trabajo en curso | preview por rama `*.domani-web.pages.dev` |

**Flujo:** se trabaja en `dev` (o ramas de feature → `dev`). Cloudflare crea una *preview*
por cada push para que la revises. Cuando apruebas, se fusiona `dev → main` y eso publica
en `domani.club`. Producción **solo** cambia con un merge a `main`.

```bash
# revisar algo nuevo
git checkout dev && git merge mi-feature && git push      # -> preview

# publicar a producción cuando esté aprobado
git checkout main && git merge dev && git push            # -> domani.club
```

---

## 1. Frontend → Cloudflare Pages (Git)

En el dashboard de Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.

1. Elige el repositorio `FabianGranados/Domani`.
2. **Production branch:** `main`.
3. **Build settings** (monorepo pnpm):
   - Framework preset: `None` (o Vite)
   - **Build command:** `pnpm install && pnpm --filter @domani/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** `/` (raíz del repo)
4. **Variables de entorno** (en Production *y* Preview):
   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://zulpnimnphycnbvhvnet.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Sx3g_m-sYKINckpYosAuvA_BmiF4DYI` |
   | `NODE_VERSION` | `20` |

   > La `anon`/publishable key es pública por diseño (RLS protege los datos). La
   > `service_role` **NUNCA** va aquí ni en el frontend.

5. Deploy. Pages te dará una URL `*.pages.dev`. Cada rama distinta de `main` genera su
   propia preview automáticamente.

### Custom domain (domani.club)

En el proyecto de Pages → **Custom domains → Set up a domain** → `domani.club` (y
`www.domani.club`). Si el dominio está en Cloudflare, los registros DNS se crean solos.
La rama `main` queda servida en `domani.club`.

---

## 2. Supabase Auth — URLs de redirección

En Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://domani.club`
- **Redirect URLs** (añadir todas):
  - `https://domani.club`
  - `https://www.domani.club`
  - `https://*.domani-web.pages.dev` (previews)
  - `http://localhost:5173` (desarrollo)

Sin esto, el login con Google y los enlaces de confirmación de correo fallan en producción.

### Google OAuth
En Supabase → **Authentication → Providers → Google**: pega el *Client ID* y *Client
Secret* de Google Cloud Console. En Google Cloud, el *Authorized redirect URI* es:
`https://zulpnimnphycnbvhvnet.supabase.co/auth/v1/callback`.

---

## 3. Worker de bots → Cloudflare Workers (segundo paso, opcional)

El lobby vivo (cron cada 15 min) se despliega aparte. Requiere `service_role` (privada).

```bash
cd apps/workers

# sembrar bots una vez (Capa 1: presencia)
SUPABASE_URL=https://zulpnimnphycnbvhvnet.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role> \
pnpm seed:bots 200

# desplegar el cron (Capa 2: actividad simulada)
pnpm wrangler login
pnpm wrangler secret put SUPABASE_URL
pnpm wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm wrangler deploy
```

La web funciona sin esto; el worker solo hace que el salón se sienta más poblado.
