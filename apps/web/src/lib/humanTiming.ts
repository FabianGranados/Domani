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
export const POKER_MAX_MS = 9000; // tope del "tanque" en un spot cerrado
export const CHESS_MIN_MS = 1800;
export const CHESS_MAX_MS = 11000; // acotado: el humano espera al bot

/**
 * Retraso humano (ms) para una decisión de póker, según su DIFICULTAD.
 * - snap: decisión obvia (basura/monstruo) -> casi instantáneo, "ya decidí".
 * - difficulty 0..1: marginal frente a presión -> se tanquea.
 * La mayoría de jugadas son snap o rutina, así la mesa se siente ágil y solo
 * de vez en cuando alguien se demora de verdad (lo que se ve humano).
 */
export function humanPokerDelayMs(c: { difficulty: number; snap: boolean }, rnd: () => number = Math.random): number {
  if (c.snap) return Math.round(clamp(350 + rnd() * 750, 300, POKER_MAX_MS)); // 0.35–1.1s
  const base = 900 + rnd() * 1200;                       // 0.9–2.1s rutina
  const think = Math.pow(clamp01(c.difficulty), 1.4) * 9000; // hasta ~9s en lo cerrado
  const occasional = rnd() < 0.06 ? 2200 + rnd() * 3500 : 0; // pensada larga rara
  return Math.round(clamp(base + think + occasional, 500, POKER_MAX_MS));
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
