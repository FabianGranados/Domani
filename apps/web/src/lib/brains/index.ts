// =============================================================================
// Domani — Registro de los 10 Pioneros
// -----------------------------------------------------------------------------
// Punto único de acceso a los arquetipos y sus bancos de voz. La Sala de Control
// y el Laboratorio de Cerebros iteran sobre esto. Un ciudadano concreto se
// deriva con citizenBrain(arquetipo, uuid) (ver types.ts).
// =============================================================================

import type { BrainSpec } from './types';
import { TIBURON, TIBURON_VOZ } from './archetypes/tiburon';
import { DON, DON_VOZ } from './archetypes/don';
import { VETERANO, VETERANO_VOZ } from './archetypes/veterano';
import { POLLO, POLLO_VOZ } from './archetypes/pollo';
import { TILTEADO, TILTEADO_VOZ } from './archetypes/tilteado';
import { FRIO, FRIO_VOZ } from './archetypes/frio';
import { GALAN, GALAN_VOZ } from './archetypes/galan';
import { LUDOPATA, LUDOPATA_VOZ } from './archetypes/ludopata';
import { ROCA, ROCA_VOZ } from './archetypes/roca';
import { ERRATICO, ERRATICO_VOZ } from './archetypes/erratico';

export * from './types';

/** Los 10 Pioneros, en orden de presentación. */
export const PIONEROS: BrainSpec[] = [
  TIBURON, DON, VETERANO, POLLO, TILTEADO, FRIO, GALAN, LUDOPATA, ROCA, ERRATICO,
];

/** Banco de voz por arquetipo (key → eventos → frases). */
export const VOZ: Record<string, Record<string, string[]>> = {
  tiburon: TIBURON_VOZ,
  don: DON_VOZ,
  veterano: VETERANO_VOZ,
  pollo: POLLO_VOZ,
  tilteado: TILTEADO_VOZ,
  frio: FRIO_VOZ,
  galan: GALAN_VOZ,
  ludopata: LUDOPATA_VOZ,
  roca: ROCA_VOZ,
  erratico: ERRATICO_VOZ,
};

/** Busca un arquetipo por su key. */
export function pioneroByKey(key: string): BrainSpec | undefined {
  return PIONEROS.find((p) => p.key === key);
}

// Composición del CAMPO por NIVEL de mesa. En micro/baja los "pollos" y jugones
// sueltos son MAYORÍA (juegan mal, suben a todo); en alta dominan los pros
// (tiburón, frío, roca, don). Así las mesas altas se juegan mejor.
const FIELD_BY_TIER: Record<string, Record<string, number>> = {
  micro: { pollo: 3.6, ludopata: 2.6, galan: 1.6, erratico: 1.6, tilteado: 1.5, tiburon: 0.8, veterano: 0.7, frio: 0.4, roca: 0.4, don: 0.2 },
  baja:  { pollo: 3.0, ludopata: 2.2, galan: 1.6, erratico: 1.5, tilteado: 1.5, tiburon: 1.0, veterano: 1.0, frio: 0.6, roca: 0.6, don: 0.4 },
  media: { pollo: 1.6, ludopata: 1.4, galan: 1.4, erratico: 1.2, tilteado: 1.3, tiburon: 1.6, veterano: 1.6, frio: 1.2, roca: 1.2, don: 1.0 },
  alta:  { pollo: 0.7, ludopata: 0.8, galan: 1.0, erratico: 0.8, tilteado: 1.0, tiburon: 2.0, veterano: 1.8, frio: 1.8, roca: 1.6, don: 1.8 },
};

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Asigna un arquetipo a un ciudadano, ponderado por el nivel de la mesa. */
export function fieldArchetype(seed: string, tier: string = 'baja'): BrainSpec {
  const W = FIELD_BY_TIER[tier] ?? FIELD_BY_TIER.baja;
  const total = PIONEROS.reduce((a, p) => a + (W[p.key] ?? 1), 0);
  let r = (hashStr(seed) / 4294967296) * total;
  for (const p of PIONEROS) {
    r -= W[p.key] ?? 1;
    if (r <= 0) return p;
  }
  return PIONEROS[0];
}

// EDAD: una variable más por ciudadano. Rango sugerido por arquetipo (el Pollo
// es joven, el Veterano mayor). Alimenta emoción/decisión: mayor = más paciente
// y tight, menos tilt; joven = más suelto e impulsivo.
const EDAD_RANGO: Record<string, [number, number]> = {
  pollo: [18, 27], ludopata: [25, 46], galan: [24, 39], erratico: [20, 42], tilteado: [21, 41],
  tiburon: [28, 46], veterano: [56, 77], frio: [30, 49], roca: [38, 63], don: [44, 69],
};

/** Edad determinista del ciudadano (según arquetipo + semilla). */
export function citizenAge(key: string, seed: string): number {
  const [lo, hi] = EDAD_RANGO[key] ?? [25, 55];
  return lo + (hashStr(seed + '|edad') % (hi - lo + 1));
}

/**
 * Elige una frase determinista del banco de voz, según evento y semilla
 * (mano/turno/uuid). Sin azar: el mismo contexto da la misma frase.
 */
export function vozDe(key: string, evento: string, seed: string): string | null {
  const banco = VOZ[key]?.[evento];
  if (!banco || banco.length === 0) return null;
  let h = 0x811c9dc5;
  const s = key + '|' + evento + '|' + seed;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return banco[(h >>> 0) % banco.length];
}
