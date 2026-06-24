// ============================================================
// DOMANI — Configuración del lobby de póker: tipos de juego + escalera de
// stakes (mesas). Todo es data: añadir Omaha/SNG reales más adelante es
// agregar entradas aquí + un motor, no reescribir el lobby.
// ============================================================

// Tipo de juego. Solo TEX es jugable hoy; OH y SNG se muestran como teaser.
export type GameCode = 'TEX' | 'OH' | 'SNG';
// Formato: cash (mesa de dinero) o torneo (SNG). Modelado para el futuro.
export type GameFormat = 'cash' | 'tournament';

export interface GameType {
  code: GameCode;
  /** Etiqueta corta (chip) que se muestra en la fila de la mesa. */
  label: string;
  /** Nombre largo legible. */
  name: string;
  format: GameFormat;
  /** false = se muestra como "Próximamente" y no es clickable. */
  playable: boolean;
}

export const GAME_TYPES: Record<GameCode, GameType> = {
  TEX: { code: 'TEX', label: 'TEX', name: "Texas Hold'em", format: 'cash', playable: true },
  OH: { code: 'OH', label: 'OH', name: 'Omaha', format: 'cash', playable: false },
  SNG: { code: 'SNG', label: 'SNG', name: 'Sit & Go', format: 'tournament', playable: false },
};

// --- Escalera de stakes (config-driven) -----------------------------------
// Anclas del producto: las mesas más bajas 10/20; las premium ~10.000 de
// buy-in con ciegas 200/400. Bankroll inicial = 500.000, así que esto es una
// escalera real: en Micro no te arruinas en una hora, pero Alta sí pega.
export type StakeTierId = 'micro' | 'baja' | 'media' | 'alta';

export interface StakeTier {
  id: StakeTierId;
  name: string;       // nombre visible del nivel
  sb: number;         // ciega pequeña
  bb: number;         // ciega grande
  buyin: number;      // stack inicial (min/recomendado) al sentarse
  maxSeats: number;   // asientos de la mesa
}

export const STAKE_LADDER: StakeTier[] = [
  { id: 'micro', name: 'Micro', sb: 10, bb: 20, buyin: 1000, maxSeats: 9 },
  { id: 'baja', name: 'Baja', sb: 25, bb: 50, buyin: 2500, maxSeats: 9 },
  { id: 'media', name: 'Media', sb: 100, bb: 200, buyin: 10000, maxSeats: 9 },
  { id: 'alta', name: 'Alta', sb: 200, bb: 400, buyin: 20000, maxSeats: 9 },
];

export interface PokerTable {
  id: string;          // único por casa (houseCode + tier + game)
  game: GameType;
  tier: StakeTier;
}

// Cada Casa ofrece, para cada nivel de la escalera, una mesa de Texas
// (jugable) y, como teaser, una de Omaha y otra de Sit & Go.
// Mantén Texas primero para que la mesa jugable sea la más visible.
export function tablesForHouse(houseCode: string): PokerTable[] {
  const out: PokerTable[] = [];
  for (const tier of STAKE_LADDER) {
    out.push({ id: `${houseCode}-${tier.id}-TEX`, game: GAME_TYPES.TEX, tier });
  }
  // Teasers "Próximamente": una Omaha de nivel medio y un Sit & Go.
  const media = STAKE_LADDER.find((t) => t.id === 'media')!;
  const baja = STAKE_LADDER.find((t) => t.id === 'baja')!;
  out.push({ id: `${houseCode}-media-OH`, game: GAME_TYPES.OH, tier: media });
  out.push({ id: `${houseCode}-baja-SNG`, game: GAME_TYPES.SNG, tier: baja });
  return out;
}

// --- Ocupación (placeholder cosmético) ------------------------------------
// PLACEHOLDER: todavía no existe el sistema de ciudadanos/multijugador, así
// que mostramos una ocupación plausible y ESTABLE (no parpadea entre renders)
// derivada de forma determinista del id de la mesa. Reemplazar por el conteo
// real de asientos ocupados cuando exista el sistema de ciudadanos.
export function seatedCount(tableId: string, maxSeats: number): number {
  let h = 0;
  for (let i = 0; i < tableId.length; i++) {
    h = (h * 31 + tableId.charCodeAt(i)) >>> 0;
  }
  // Entre 1 y maxSeats-1 (nunca vacía del todo, nunca llena: siempre hay sitio).
  return 1 + (h % Math.max(1, maxSeats - 1));
}
