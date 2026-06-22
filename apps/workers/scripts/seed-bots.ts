// ============================================================
// Seed de jugadores IA (Capa 1: presencia).
// Crea N bots: auth user + profile(is_bot=true) + wallet + tessera,
// con alias naturales por Casa, rango e Influencia variados.
//
// Uso (desde apps/workers):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed:bots [N]
//
// Requiere service_role (privado). profiles.id referencia auth.users,
// por eso creamos un auth user por bot vía admin API.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { generateAlias, HOUSE_CODES } from '../src/aliases';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COUNT = Number(process.argv[2] ?? 200);

const RANKS = [
  'ciudadano_nuevo',
  'ciudadano_activo',
  'ciudadano_reconocido',
  'ciudadano_patricio',
  'consigliere',
  'don',
] as const;

if (!URL || !KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { persistSession: false } });

function rnd<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Mapa de code -> house_id
  const { data: houses, error: hErr } = await admin.from('houses').select('id, code');
  if (hErr || !houses) throw hErr ?? new Error('sin casas');
  const houseByCode = Object.fromEntries(houses.map((h) => [h.code, h.id]));

  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    const houseCode = rnd(HOUSE_CODES);
    const alias = generateAlias(houseCode);
    const email = `bot+${crypto.randomUUID()}@bots.domani.local`;

    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { is_bot: true },
    });
    if (uErr || !u.user) {
      console.warn('skip (auth):', uErr?.message);
      continue;
    }
    const id = u.user.id;

    const { error: pErr } = await admin.from('profiles').insert({
      id,
      alias: `${alias}#${i}`, // sufijo para garantizar unicidad
      is_bot: true,
      age_confirmed: true,
      rank: rnd(RANKS),
      influence: Math.floor(Math.random() * 5000),
      house_id: houseByCode[houseCode],
    });
    if (pErr) {
      console.warn('skip (profile):', pErr.message);
      continue;
    }

    await admin.from('wallets').insert({ user_id: id, balance: 0 });
    await admin.from('tesseras').insert({ user_id: id });
    await admin.from('house_memberships').insert({ user_id: id, house_id: houseByCode[houseCode] });
    created++;
    if (created % 25 === 0) console.log(`...${created} bots`);
  }

  console.log(`Listo: ${created}/${COUNT} bots sembrados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
