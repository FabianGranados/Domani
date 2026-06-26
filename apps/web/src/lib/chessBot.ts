import { Chess, type Move } from 'chess.js';

// ============================================================
// Bot de ajedrez: negamax con poda alfa-beta + ordenamiento de jugadas
// (capturas/coronaciones primero). Evaluación por material. Juega decente
// para un casual: no cuelga piezas, ve mates cercanos. Sube `depth` para
// más fuerza (más lento).
// ============================================================
const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 1_000_000;

function material(game: Chess): number {
  let s = 0;
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq) s += VAL[sq.type] * (sq.color === 'w' ? 1 : -1);
    }
  }
  return s;
}

// Evaluación desde la perspectiva del lado a mover.
function evalSTM(game: Chess): number {
  const m = material(game);
  return game.turn() === 'w' ? m : -m;
}

function moveScore(m: Move): number {
  let r = 0;
  if (m.flags.includes('c')) r += 10 + VAL[(m.captured as string) ?? 'p'] / 100;
  if (m.flags.includes('p')) r += 9;
  if (m.flags.includes('e')) r += 1;
  return r;
}

function ordered(game: Chess): Move[] {
  return (game.moves({ verbose: true }) as Move[]).sort((a, b) => moveScore(b) - moveScore(a));
}

function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isCheckmate()) return -MATE - depth; // lado a mover está mateado
  if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 0;
  if (depth === 0) return evalSTM(game);

  let best = -Infinity;
  for (const m of ordered(game)) {
    game.move(m);
    const score = -search(game, depth - 1, -beta, -alpha);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Mejor jugada para el lado a mover en `fen`. Elige al azar entre las
// jugadas casi-óptimas para dar variedad entre partidas.
export function bestMove(fen: string, depth = 3): Move | null {
  const game = new Chess(fen);
  const moves = ordered(game);
  if (moves.length === 0) return null;

  const scored = moves.map((m) => {
    game.move(m);
    const s = -search(game, depth - 1, -Infinity, Infinity);
    game.undo();
    return { m, s };
  });

  const max = Math.max(...scored.map((x) => x.s));
  const pool = scored.filter((x) => x.s >= max - 20).map((x) => x.m);
  return pool[Math.floor(Math.random() * pool.length)] ?? moves[0];
}
