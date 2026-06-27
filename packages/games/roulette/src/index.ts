// ============================================================
// @domani/game-roulette — Ruleta europea (un solo cero)
// ============================================================
// Reglas PURAS de la ruleta, reutilizables. El RNG autoritativo
// vive SIEMPRE en el servidor (spin_roulette / spin_roulette_free),
// anti-fraude: el cliente jamás decide el número. Este módulo
// expresa el contrato GameModule y comparte con la UI el orden
// físico de las casillas y la liquidación de apuestas, para que
// la rueda visual y el servidor hablen el mismo idioma.
// ============================================================

import type {
  GameModule,
  GameContext,
  Participant,
  PlayerResult,
} from '@domani/game-core';

/** Orden físico de las casillas en la rueda europea (sentido horario). */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

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
  | 'high'
  | 'dozen'
  | 'column';

export interface RouletteBet {
  userId: string;
  type: BetType;
  /**
   * Requerido para apuestas con variante:
   *   'straight' -> número 0..36
   *   'dozen'    -> 1 (1-12) | 2 (13-24) | 3 (25-36)
   *   'column'   -> 1 (n%3=1) | 2 (n%3=2) | 3 (n%3=0)
   */
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

export type SpinColor = 'red' | 'black' | 'green';
export function colorOf(n: number): SpinColor {
  if (n === 0) return 'green';
  return isRed(n) ? 'red' : 'black';
}

/**
 * Cuota de GANANCIA "a 1" por tipo de apuesta (ruleta europea).
 * El retorno TOTAL de una apuesta ganadora es stake * (payoutMultiplier + 1),
 * porque el stake se considera ya debitado al apostar.
 */
export function payoutMultiplier(type: BetType): number {
  switch (type) {
    case 'straight':
      return 35;
    case 'dozen':
    case 'column':
      return 2;
    default:
      return 1; // red/black/even/odd/low/high (dinero parejo)
  }
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
    case 'dozen': {
      if (bet.value === 1) return n >= 1 && n <= 12;
      if (bet.value === 2) return n >= 13 && n <= 24;
      if (bet.value === 3) return n >= 25 && n <= 36;
      return false;
    }
    case 'column': {
      if (n === 0) return false;
      if (bet.value === 1) return n % 3 === 1;
      if (bet.value === 2) return n % 3 === 2;
      if (bet.value === 3) return n % 3 === 0;
      return false;
    }
  }
}

export interface BetSettlement {
  /** total apostado en la ronda */
  staked: number;
  /** retorno total a acreditar (stake + ganancia de las apuestas ganadoras) */
  returned: number;
  /** neto de la ronda (returned - staked) */
  net: number;
}

/**
 * Liquida un conjunto de apuestas contra el número que salió.
 * Modelo: el stake se debita al apostar; las ganadoras devuelven
 * stake * (cuota + 1). Es la misma matemática que usa el RPC del
 * servidor (la fuente de verdad económica).
 */
export function settleBets(bets: RouletteBet[], n: number): BetSettlement {
  let staked = 0;
  let returned = 0;
  for (const bet of bets) {
    staked += bet.stake;
    if (betWins(bet, n)) {
      returned += bet.stake * (payoutMultiplier(bet.type) + 1);
    }
  }
  return { staked, returned, net: returned - staked };
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
    return state.bets.map((bet) => {
      const won = betWins(bet, n);
      // neto por apuesta: ganadora gana stake*cuota; perdedora pierde stake.
      const delta = won ? bet.stake * payoutMultiplier(bet.type) : -bet.stake;
      return {
        user_id: bet.userId,
        position: won ? 1 : 2,
        aurelios_delta: delta,
        influence_delta: 0,
      };
    });
  },
};

export default RouletteModule;
