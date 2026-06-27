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
