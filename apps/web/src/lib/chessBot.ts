import { Chess, type Move } from 'chess.js';

// ============================================================
// Bot de ajedrez de Domani.
//
// Motor clásico: negamax + poda alfa-beta + ordenamiento de jugadas
// (MVV-LVA), búsqueda de quietud (quiescence) en las hojas, profundización
// iterativa con tope de tiempo suave, evaluación posicional (PST con eval
// "tapered" mediogame/final, seguridad del rey, movilidad y estructura de
// peones) y un pequeño libro de aperturas.
//
// 5 niveles calibrados: cada nivel mezcla profundidad, tiempo, libro y una
// PROBABILIDAD DE ERROR humano (temperatura softmax) para sentirse como un
// rival humano más débil, no como un motor lobotomizado.
//
// Toda la configuración por nivel está en LEVELS (abajo) para retunear fácil.
// ============================================================

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 1_000_000;

// ------------------------------------------------------------
// Piece-square tables (perspectiva de las BLANCAS, índice 0 = a8 ... 63 = h1).
// Para negras se reflejan verticalmente. Valores en centipeones.
// ------------------------------------------------------------
const PST_P = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const PST_N = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const PST_B = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const PST_R = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const PST_Q = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const PST_K_MG = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
const PST_K_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const PST: Record<string, number[]> = { p: PST_P, n: PST_N, b: PST_B, r: PST_R, q: PST_Q };

// Fase de juego total con todas las piezas en el tablero (sin reyes ni peones).
// Caballo/alfil = 1, torre = 2, dama = 4 → 2*(1+1+2)+2*4 = 24.
const PHASE_VAL: Record<string, number> = { n: 1, b: 1, r: 2, q: 4, p: 0, k: 0 };
const PHASE_TOTAL = 24;

// ------------------------------------------------------------
// Evaluación
// ------------------------------------------------------------
type Sq = { type: string; color: 'w' | 'b' } | null;

// Evalúa la posición desde la perspectiva de las BLANCAS (positivo = blancas mejor).
function evaluate(game: Chess): number {
  const board = game.board() as Sq[][]; // board[0] = rank 8 (arriba)
  let mg = 0; // score mediojuego
  let eg = 0; // score final
  let phase = 0;

  // Columnas con peones, por color, para estructura de peones.
  const wPawnFiles: number[] = new Array(8).fill(0);
  const bPawnFiles: number[] = new Array(8).fill(0);
  // Para peones pasados necesitamos la fila más avanzada por columna.
  const wPawnRank: number[] = new Array(8).fill(-1); // rank index 0..7 (0 = rank8)
  const bPawnRank: number[] = new Array(8).fill(-1);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      if (sq.type === 'p') {
        if (sq.color === 'w') { wPawnFiles[f]++; if (wPawnRank[f] === -1 || r < wPawnRank[f]) wPawnRank[f] = r; }
        else { bPawnFiles[f]++; if (r > bPawnRank[f]) bPawnRank[f] = r; }
      }
      phase += PHASE_VAL[sq.type];
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const sign = sq.color === 'w' ? 1 : -1;
      const v = VAL[sq.type];
      // índice PST desde perspectiva blanca: r=0 es rank8 → idx 0. Para negras reflejar.
      const idxW = r * 8 + f;
      const idx = sq.color === 'w' ? idxW : (7 - r) * 8 + f;

      let pmg = v;
      let peg = v;
      if (sq.type === 'k') {
        pmg += PST_K_MG[idx];
        peg += PST_K_EG[idx];
      } else {
        const t = PST[sq.type][idx];
        pmg += t;
        peg += t;
      }
      mg += sign * pmg;
      eg += sign * peg;
    }
  }

  // ---- Estructura de peones (barato) ----
  let pawnScore = 0;
  for (let f = 0; f < 8; f++) {
    // doblados
    if (wPawnFiles[f] > 1) pawnScore -= 12 * (wPawnFiles[f] - 1);
    if (bPawnFiles[f] > 1) pawnScore += 12 * (bPawnFiles[f] - 1);
    // aislados
    const wLeft = f > 0 ? wPawnFiles[f - 1] : 0;
    const wRight = f < 7 ? wPawnFiles[f + 1] : 0;
    const bLeft = f > 0 ? bPawnFiles[f - 1] : 0;
    const bRight = f < 7 ? bPawnFiles[f + 1] : 0;
    if (wPawnFiles[f] > 0 && wLeft === 0 && wRight === 0) pawnScore -= 14;
    if (bPawnFiles[f] > 0 && bLeft === 0 && bRight === 0) pawnScore += 14;
    // pasados (no hay peones enemigos delante en su columna ni adyacentes)
    if (wPawnFiles[f] > 0) {
      const fr = wPawnRank[f]; // 0 = rank8 (más avanzado para blancas)
      const blocked =
        (bPawnRank[f] !== -1 && bPawnRank[f] < fr) ||
        (f > 0 && bPawnRank[f - 1] !== -1 && bPawnRank[f - 1] < fr) ||
        (f < 7 && bPawnRank[f + 1] !== -1 && bPawnRank[f + 1] < fr);
      if (!blocked) {
        const adv = 7 - fr; // 0..6 avance
        pawnScore += 10 + adv * adv * 2;
      }
    }
    if (bPawnFiles[f] > 0) {
      const fr = bPawnRank[f]; // 7 = rank1 (más avanzado para negras)
      const blocked =
        (wPawnRank[f] !== -1 && wPawnRank[f] > fr) ||
        (f > 0 && wPawnRank[f - 1] !== -1 && wPawnRank[f - 1] > fr) ||
        (f < 7 && wPawnRank[f + 1] !== -1 && wPawnRank[f + 1] > fr);
      if (!blocked) {
        const adv = fr; // avance
        pawnScore -= 10 + adv * adv * 2;
      }
    }
  }

  // ---- Seguridad del rey (escudo de peones / columnas abiertas) ----
  // Solo relevante en mediojuego; se atenúa por la fase abajo.
  let kingMg = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq || sq.type !== 'k') continue;
      const sign = sq.color === 'w' ? 1 : -1;
      const ownFiles = sq.color === 'w' ? wPawnFiles : bPawnFiles;
      // escudo: peones propios en la columna del rey y adyacentes
      let shield = 0;
      for (let df = -1; df <= 1; df++) {
        const cf = f + df;
        if (cf < 0 || cf > 7) continue;
        if (ownFiles[cf] > 0) shield += 1;
        else shield -= 1; // columna abierta cerca del rey = malo
      }
      kingMg += sign * shield * 8;
    }
  }

  // ---- Movilidad (barato: número de jugadas legales del lado a mover) ----
  // Pequeño término. Se mide solo para el lado a mover para no duplicar coste.
  const mob = (game.moves() as string[]).length;
  const mobScore = (game.turn() === 'w' ? 1 : -1) * mob * 1.5;

  // Tapered eval: mezcla mg/eg según fase.
  const ph = Math.max(0, Math.min(PHASE_TOTAL, phase));
  const mgWeight = ph / PHASE_TOTAL;
  const egWeight = 1 - mgWeight;
  const tapered = mg * mgWeight + eg * egWeight;

  return tapered + pawnScore + kingMg * mgWeight + mobScore;
}

// Evaluación desde la perspectiva del lado a mover.
function evalSTM(game: Chess): number {
  const e = evaluate(game);
  return game.turn() === 'w' ? e : -e;
}

// ------------------------------------------------------------
// Ordenamiento de jugadas: MVV-LVA para capturas, bonus coronación.
// ------------------------------------------------------------
function moveScore(m: Move): number {
  let r = 0;
  if (m.flags.includes('c') || m.flags.includes('e')) {
    const victim = VAL[(m.captured as string) ?? 'p'];
    const attacker = VAL[m.piece] || 100;
    r += 10000 + victim * 10 - attacker; // MVV-LVA
  }
  if (m.flags.includes('p')) r += 9000;
  return r;
}

function ordered(game: Chess): Move[] {
  return (game.moves({ verbose: true }) as Move[]).sort((a, b) => moveScore(b) - moveScore(a));
}

// Solo capturas y coronaciones, ordenadas, para quiescence.
function tacticalMoves(game: Chess): Move[] {
  return (game.moves({ verbose: true }) as Move[])
    .filter((m) => m.flags.includes('c') || m.flags.includes('e') || m.flags.includes('p'))
    .sort((a, b) => moveScore(b) - moveScore(a));
}

// ------------------------------------------------------------
// Quiescence: en las hojas, sigue resolviendo capturas/coronaciones hasta
// llegar a una posición tranquila. Mata el efecto horizonte.
// ------------------------------------------------------------
function quiescence(game: Chess, alpha: number, beta: number, deadline: number): number {
  const standPat = evalSTM(game);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  if (Date.now() > deadline) return alpha;

  for (const m of tacticalMoves(game)) {
    game.move(m);
    const score = -quiescence(game, -beta, -alpha, deadline);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ------------------------------------------------------------
// Negamax con alfa-beta y quiescence opcional.
// ------------------------------------------------------------
function search(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
  useQuiescence: boolean,
): number {
  if (game.isCheckmate()) return -MATE - depth; // lado a mover está mateado
  if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 0;
  if (depth <= 0) return useQuiescence ? quiescence(game, alpha, beta, deadline) : evalSTM(game);

  let best = -Infinity;
  for (const m of ordered(game)) {
    game.move(m);
    const score = -search(game, depth - 1, -beta, -alpha, deadline, useQuiescence);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
    if (Date.now() > deadline) break; // corte por tiempo
  }
  return best;
}

// ------------------------------------------------------------
// Configuración por nivel. Tabla única para retunear fácil.
//   maxDepth   : profundidad objetivo de la profundización iterativa
//   timeMs     : tope de tiempo suave para la búsqueda (muy por debajo de la
//                pausa "humana" de la UI, ~0.6-2.5s)
//   quiescence : usar búsqueda de quietud en las hojas
//   book       : usar libro de aperturas
//   temperature: temperatura softmax para elegir entre candidatos. 0 = siempre
//                la mejor. Más alto = más probable elegir una jugada inferior
//                (error "humano").
//   blunderProb: probabilidad de cometer un desliz claro (elegir entre todas
//                las jugadas legales no perdedoras de golpe, no la mejor).
// ------------------------------------------------------------
export type Level = 1 | 2 | 3 | 4 | 5;
type LevelConfig = {
  maxDepth: number;
  timeMs: number;
  quiescence: boolean;
  book: boolean;
  temperature: number;
  blunderProb: number;
};

const LEVELS: Record<Level, LevelConfig> = {
  1: { maxDepth: 1, timeMs: 120, quiescence: false, book: false, temperature: 220, blunderProb: 0.28 },
  2: { maxDepth: 2, timeMs: 250, quiescence: false, book: false, temperature: 120, blunderProb: 0.14 },
  3: { maxDepth: 3, timeMs: 450, quiescence: true, book: true, temperature: 55, blunderProb: 0.06 },
  4: { maxDepth: 5, timeMs: 800, quiescence: true, book: true, temperature: 22, blunderProb: 0.015 },
  5: { maxDepth: 7, timeMs: 1050, quiescence: true, book: true, temperature: 0, blunderProb: 0 },
};

// ------------------------------------------------------------
// Libro de aperturas. Clave = FEN sin los contadores de jugada (los 4 primeros
// campos), valor = lista de jugadas SAN razonables. Cubre solo los primeros
// plies; fuera del libro caemos a la búsqueda. Hay variedad por el azar.
// ------------------------------------------------------------
function bookKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

const START = bookKey(new Chess().fen());

const BOOK: Record<string, string[]> = {
  // Posición inicial: aperturas sólidas para blancas.
  [START]: ['e4', 'd4', 'c4', 'Nf3'],
};

// Construye el libro jugando líneas conocidas desde la inicial.
(function buildBook() {
  const lines: string[][] = [
    // e4 e5 — Italiana / Española
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'],
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
    // e4 c5 — Siciliana
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
    ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
    // e4 e6 — Francesa
    ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    // e4 c6 — Caro-Kann
    ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6'],
    // d4 d5 — Gambito de dama
    ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
    ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6'],
    // d4 Nf6 — Indias
    ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7'],
    // c4 — Inglesa
    ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
    // Nf3
    ['Nf3', 'd5', 'd4', 'Nf6', 'c4', 'e6'],
  ];
  for (const line of lines) {
    const g = new Chess();
    for (const san of line) {
      const key = bookKey(g.fen());
      if (!BOOK[key]) BOOK[key] = [];
      if (!BOOK[key].includes(san)) BOOK[key].push(san);
      try {
        g.move(san);
      } catch {
        break; // SAN inválido en esta posición (defensa): cortar la línea
      }
    }
  }
})();

function bookMove(game: Chess): Move | null {
  const key = bookKey(game.fen());
  const sans = BOOK[key];
  if (!sans || sans.length === 0) return null;
  // Filtra a las que sean legales (chess.js valida por SAN).
  const legal: Move[] = [];
  for (const san of sans) {
    try {
      const mv = game.move(san) as Move;
      game.undo();
      legal.push(mv);
    } catch {
      /* SAN no legal aquí */
    }
  }
  if (legal.length === 0) return null;
  return legal[Math.floor(Math.random() * legal.length)];
}

// ------------------------------------------------------------
// Profundización iterativa con tope de tiempo suave. Devuelve todas las
// jugadas de raíz con su puntuación (para aplicar el modelo de error humano).
// ------------------------------------------------------------
function searchRoot(
  game: Chess,
  cfg: LevelConfig,
): { m: Move; s: number }[] {
  const moves = ordered(game);
  if (moves.length === 0) return [];

  const deadline = Date.now() + cfg.timeMs;
  let scored: { m: Move; s: number }[] = moves.map((m) => ({ m, s: 0 }));

  for (let depth = 1; depth <= cfg.maxDepth; depth++) {
    const next: { m: Move; s: number }[] = [];
    let alpha = -Infinity;
    const beta = Infinity;
    let aborted = false;
    // Busca primero la mejor de la iteración previa (ordena por score anterior).
    const order = depth === 1 ? scored : [...scored].sort((a, b) => b.s - a.s);
    for (const { m } of order) {
      game.move(m);
      const s = -search(game, depth - 1, -beta, -alpha, deadline, cfg.quiescence);
      game.undo();
      next.push({ m, s });
      if (s > alpha) alpha = s;
      if (Date.now() > deadline) { aborted = true; break; }
    }
    if (next.length > 0) {
      // Conserva la iteración completa más profunda; si se abortó a medias,
      // mantenemos lo conseguido pero priorizamos resultados completos.
      if (!aborted || next.length === order.length) {
        scored = next;
      } else {
        // Mezcla: usa los nuevos scores calculados, completa con los viejos.
        const map = new Map(next.map((x) => [x.m.san, x.s]));
        scored = scored.map((x) => ({ m: x.m, s: map.has(x.m.san) ? (map.get(x.m.san) as number) : x.s }));
      }
    }
    if (aborted) break;
  }

  return scored.sort((a, b) => b.s - a.s);
}

// ------------------------------------------------------------
// Modelo de error humano: dado el ranking de jugadas, elige una con softmax
// según la temperatura, y con prob. blunderProb comete un desliz mayor.
// ------------------------------------------------------------
function pickHumanMove(scored: { m: Move; s: number }[], cfg: LevelConfig): Move {
  if (scored.length === 1) return scored[0].m;
  const best = scored[0].s;

  // Desliz claro: con cierta probabilidad ignora la búsqueda y toma una jugada
  // peor (pero que no regale mate de inmediato), como un humano distraído.
  if (cfg.blunderProb > 0 && Math.random() < cfg.blunderProb) {
    // candidatos que no sean catastróficos (no se dejan matar de un golpe)
    const safe = scored.filter((x) => x.s > -MATE / 2);
    const pool = safe.length > 1 ? safe.slice(1) : scored; // evita la mejor si se puede
    return pool[Math.floor(Math.random() * pool.length)].m;
  }

  if (cfg.temperature <= 0) {
    // Determinista salvo empates casi exactos (variedad mínima).
    const top = scored.filter((x) => x.s >= best - 5).map((x) => x.m);
    return top[Math.floor(Math.random() * top.length)];
  }

  // Softmax sobre los mejores candidatos (limita a 6 para no premiar basura).
  const cands = scored.slice(0, 6);
  const weights = cands.map((x) => Math.exp((x.s - best) / cfg.temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i].m;
  }
  return cands[0].m;
}

// ------------------------------------------------------------
// API pública
// ------------------------------------------------------------

// Mejor jugada calibrada por nivel (1..5). Usa libro + búsqueda + error humano.
export function bestMoveForLevel(fen: string, level: Level): Move | null {
  const game = new Chess(fen);
  const cfg = LEVELS[level] ?? LEVELS[3];

  if (cfg.book) {
    const bm = bookMove(game);
    if (bm) return bm;
  }

  const scored = searchRoot(game, cfg);
  if (scored.length === 0) return null;
  return pickHumanMove(scored, cfg);
}

// Compat: API antigua por profundidad. Mapea depth→nivel aproximado.
export function bestMove(fen: string, depth = 3): Move | null {
  const level: Level = depth <= 2 ? 2 : depth <= 3 ? 3 : depth <= 4 ? 4 : 5;
  return bestMoveForLevel(fen, level);
}
