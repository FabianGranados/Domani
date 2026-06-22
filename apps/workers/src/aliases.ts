// ============================================================
// Generador de alias para jugadores IA (DOMANI_BUILD_CODE.md §6).
// Combina listas temáticas por Casa + sufijos. Evita nombres reales
// de personas. Marcar SIEMPRE is_bot=true en la DB.
// ============================================================

type HouseCode = 'bacata' | 'lexington' | 'plata' | 'morro' | 'roma' | 'osaka';

const ROOTS: Record<HouseCode, string[]> = {
  // Bogotá / andino / frío
  bacata: ['Páramo', 'Monserrate', 'Sabana', 'Tequendama', 'Chía', 'Guavio', 'Niebla', 'Andes'],
  // Nueva York / mercado / tiempo
  lexington: ['Madison', 'Hudson', 'Tribeca', 'Soho', 'Astor', 'Lenox', 'Gotham', 'Park'],
  // Buenos Aires / porteño / tango
  plata: ['Tango', 'Palermo', 'Recoleta', 'Boca', 'Riachuelo', 'Bandoneón', 'Milonga', 'Plata'],
  // Río / morro / samba
  morro: ['Morro', 'Samba', 'Tijuca', 'Ipanema', 'Lapa', 'Carioca', 'Favela', 'Pão'],
  // Roma / clásico / decisión
  roma: ['Aurelio', 'Cesare', 'Foro', 'Trastevere', 'Palatino', 'Imperio', 'Augusto', 'Coliseo'],
  // Osaka / japonés / precisión
  osaka: ['Sakura', 'Dojima', 'Namba', 'Tengu', 'Katana', 'Shogun', 'Kintsugi', 'Umeda'],
};

const TITLES = ['', 'El', 'La', 'Don', 'Señor', 'Maestro', 'Dama'];
const SUFFIXES = ['', '_', '.', ''];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAlias(house: HouseCode): string {
  const root = pick(ROOTS[house]);
  const title = pick(TITLES);
  const sep = pick(SUFFIXES);
  const num = Math.random() < 0.7 ? String(Math.floor(Math.random() * 9000) + 100) : '';
  const base = title ? `${title} ${root}` : root;
  return `${base}${sep}${num}`.trim();
}

export const HOUSE_CODES: HouseCode[] = [
  'bacata',
  'lexington',
  'plata',
  'morro',
  'roma',
  'osaka',
];
