// =============================================================================
// Ritmo humano — cuánto se "demora" un bot antes de actuar
// -----------------------------------------------------------------------------
// Problema: si el bot responde en ~1s y siempre igual, se nota a leguas que es
// una máquina. Un humano tarda variable: rápido en lo obvio (pasar, recapturar)
// y se TANQUEA en lo difícil (pagar una grande, posición complicada), con algún
// pensada larga ocasional. Esto modela eso, con límites configurables.
//
// Pensado para que, el día de humano-vs-humano, un bot no se delate por veloz.
// Los límites (MIN/MAX) están aquí arriba para volverlos perillas de la Sala de
// Control más adelante.
// =============================================================================

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// --- Límites (futuras perillas de admin) ---
export const POKER_MIN_MS = 2000;
export const POKER_MAX_MS = 20000; // hasta ~20s en un spot durísimo
export const CHESS_MIN_MS = 1800;
export const CHESS_MAX_MS = 11000; // acotado: el humano espera al bot

interface PokerCtx {
  toCall: number;   // cuánto falta por pagar
  pot: number;      // bote actual
  stack: number;    // fichas del que actúa
  street: number;   // 0 preflop, 3 flop, 4 turn, 5 river
  canCheck: boolean;
}

/**
 * Retraso humano (ms) para una decisión de póker. `rnd` es un PRNG [0,1) — pasa
 * Math.random para variedad natural entre manos.
 */
export function humanPokerDelayMs(c: PokerCtx, rnd: () => number = Math.random): number {
  // Si puede pasar gratis y no hay presión, suele ser rápido.
  if (c.canCheck && rnd() < 0.6) {
    return Math.round(clamp(1400 + rnd() * 2400, POKER_MIN_MS, POKER_MAX_MS));
  }
  const potOdds = c.toCall / (c.pot + c.toCall + 1);
  const stackRisk = c.toCall / (c.stack + 1);
  const crit = clamp01(potOdds * 0.5 + stackRisk * 1.0 + (c.street >= 4 ? 0.2 : 0));
  const base = 2200 + rnd() * 3200;            // 2.2–5.4s
  const tank = crit * (5000 + rnd() * 9000);   // hasta ~14s en lo serio
  const occasional = rnd() < 0.1 ? 4000 + rnd() * 7000 : 0; // pensada larga rara
  return Math.round(clamp(base + tank + occasional, POKER_MIN_MS, POKER_MAX_MS));
}

interface ChessCtx {
  legalMoves: number; // ramificación = complejidad aproximada
  inCheck: boolean;
  pieceCount: number; // piezas en el tablero (fase de la partida)
  level: number;      // 1..5: el más fuerte piensa algo más
}

/** Retraso humano (ms) para una jugada de ajedrez. */
export function humanChessDelayMs(c: ChessCtx, rnd: () => number = Math.random): number {
  // medio juego = más lento; aperturas y finales algo más ágiles
  const phase = c.pieceCount > 26 ? 0.7 : c.pieceCount > 12 ? 1.0 : 0.85;
  const complexity = clamp01(c.legalMoves / 38);
  const crit = clamp01(complexity * 0.7 * phase + (c.inCheck ? 0.3 : 0) + c.level * 0.05);
  const base = 1600 + rnd() * 2400;            // 1.6–4s
  const tank = crit * (4000 + rnd() * 6000);   // hasta ~10s en posiciones densas
  const occasional = rnd() < 0.06 ? 3000 + rnd() * 4000 : 0;
  return Math.round(clamp(base + tank + occasional, CHESS_MIN_MS, CHESS_MAX_MS));
}
