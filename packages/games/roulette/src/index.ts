// ============================================================
// @domani/game-roulette — Ruleta europea (un solo cero)
// ============================================================
// Reglas PURAS de la ruleta, reutilizables. El RNG autoritativo
// para el modo gratuito vive en el servidor (spin_roulette_free),
// anti-fraude. Este módulo expresa el contrato GameModule para
// que el mismo núcleo pueda liquidar ruleta multijugador a futuro.
// ============================================================

import type {
  GameModule,
  GameContext,
  Participant,
  PlayerResult,
} from '@domani/game-core';

export const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
] as const;

export type BetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high';

export interface RouletteBet {
  userId: string;
  type: BetType;
  /** requerido solo para 'straight' (0..36) */
  value?: number;
  /** apuesta en Aurelios (0 en el minijuego gratis) */
  stake: number;
}

export interface RouletteState {
  ctx: GameContext;
  bets: RouletteBet[];
  spun: number | null;
}

export function isRed(n: number): boolean {
  return (RED_NUMBERS as readonly number[]).includes(n);
}

/** Multiplicador de pago por tipo de apuesta (ruleta europea). */
export function payoutMultiplier(type: BetType): number {
  return type === 'straight' ? 35 : 2;
}

/** ¿La apuesta gana dado el número que salió? */
export function betWins(bet: RouletteBet, n: number): boolean {
  switch (bet.type) {
    case 'straight':
      return bet.value != null && bet.value === n;
    case 'red':
      return isRed(n) && n !== 0;
    case 'black':
      return !isRed(n) && n !== 0;
    case 'even':
      return n !== 0 && n % 2 === 0;
    case 'odd':
      return n % 2 === 1;
    case 'low':
      return n >= 1 && n <= 18;
    case 'high':
      return n >= 19 && n <= 36;
  }
}

export const RouletteModule: GameModule<RouletteState, RouletteBet> = {
  code: 'roulette',
  family: 'chance',
  minPlayers: 1,
  maxPlayers: 8,

  createSession(ctx: GameContext, _participants: Participant[]): RouletteState {
    return { ctx, bets: [], spun: null };
  },

  join(state, _participant) {
    return state;
  },

  // En ruleta "playTurn" = colocar una apuesta.
  playTurn(state, userId, move) {
    return { ...state, bets: [...state.bets, { ...move, userId }] };
  },

  isFinished(state) {
    return state.spun !== null;
  },

  resolve(state): PlayerResult[] {
    const n = state.spun;
    if (n === null) throw new Error('La ruleta aún no ha girado');
    return state.bets.map((bet, i) => {
      const won = betWins(bet, n);
      const delta = won ? bet.stake * payoutMultiplier(bet.type) : -bet.stake;
      return {
        user_id: bet.userId,
        position: won ? 1 : 2,
        aurelios_delta: delta,
        influence_delta: 0,
        // posición estable para evitar colisiones de orden
        ...(i >= 0 ? {} : {}),
      };
    });
  },
};

export default RouletteModule;
