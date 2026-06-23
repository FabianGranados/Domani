// ============================================================
// Motor de Texas Hold'em (vs bots) — lógica pura, client-side.
// Fase de pruebas: 1 humano + bots. Solo Aurelios (fantasía).
// Nota: usa un único bote (sin side-pots completos) — suficiente
// para jugar/probar vs bots; se endurecerá en multijugador real.
// ============================================================

export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card { r: number; s: Suit } // r: 2..14 (11=J,12=Q,13=K,14=A)
export type Phase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'done';
export type BotStyle = 'agresivo' | 'conservador' | 'normal';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  style: BotStyle;
  stack: number;
  bet: number;       // fichas apostadas en esta ronda
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  acted: boolean;    // ya actuó en esta ronda de apuestas
  lastAction?: string;
}

export interface Game {
  players: Player[];
  dealer: number;
  sb: number;
  bb: number;
  phase: Phase;
  board: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  toAct: number;
  deck: Card[];
  handOver: boolean;
  winners: { id: string; amount: number }[];
  log: string[];
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANK_LABEL: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
export const isRed = (s: Suit) => s === '♥' || s === '♦';

function freshDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ---------- Evaluación de manos (mejor de 7) ----------
// Devuelve un número comparable (mayor = mejor).
function evaluate5(cards: Card[]): number {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  // cuenta por rango
  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ r: +r, c }))
    .sort((a, b) => (b.c - a.c) || (b.r - a.r));
  // straight (incluye rueda A-5)
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks[0] === 14 && ranks[1] === 5 && ranks[4] === 2) straightHigh = 5;
  }
  const tiebreak = groups.map((g) => g.r);
  const enc = (cat: number, kick: number[]) => {
    let v = cat;
    for (let i = 0; i < 5; i++) v = v * 15 + (kick[i] || 0);
    return v;
  };
  if (straightHigh && flush) return enc(8, [straightHigh]);
  if (groups[0].c === 4) return enc(7, [groups[0].r, groups[1].r]);
  if (groups[0].c === 3 && groups[1].c === 2) return enc(6, [groups[0].r, groups[1].r]);
  if (flush) return enc(5, ranks);
  if (straightHigh) return enc(4, [straightHigh]);
  if (groups[0].c === 3) return enc(3, tiebreak);
  if (groups[0].c === 2 && groups[1].c === 2) return enc(2, tiebreak);
  if (groups[0].c === 2) return enc(1, tiebreak);
  return enc(0, ranks);
}

// Mejor mano de 5 entre N cartas (5, 6 o 7).
export function evaluate7(cards: Card[]): number {
  const n = cards.length;
  if (n < 5) return 0;
  let best = 0;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const sc = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (sc > best) best = sc;
          }
  return best;
}

export const HAND_NAME = (cat: number): string =>
  ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'][cat] ?? '';

export function handCategory(score: number): number {
  // cat = score / 15^5
  return Math.floor(score / 759375);
}

// ---------- Inicio de mano ----------
export function startHand(players: Player[], dealer: number, sb: number, bb: number): Game {
  const deck = freshDeck();
  const p: Player[] = players.map((pl) => ({ ...pl, bet: 0, hole: [] as Card[], folded: pl.stack <= 0, allIn: false, acted: false, lastAction: undefined }));
  // repartir 2 a cada uno activo
  for (let k = 0; k < 2; k++) for (const pl of p) if (!pl.folded) pl.hole.push(deck.pop()!);

  // orden de juego relativo al dealer (dealer+1 = ciega pequeña, etc.)
  const order: number[] = [];
  for (let k = 1; k <= p.length; k++) {
    const idx = (dealer + k) % p.length;
    if (!p[idx].folded) order.push(idx);
  }
  const n = order.length;
  const sbIdx = order[0];
  const bbIdx = order[1 % n];
  post(p[sbIdx], sb);
  post(p[bbIdx], bb);
  const firstToAct = order[2 % n]; // después de la ciega grande

  return {
    players: p,
    dealer,
    sb,
    bb,
    phase: 'preflop',
    board: [],
    pot: 0,
    currentBet: bb,
    minRaise: bb,
    toAct: firstToAct,
    deck,
    handOver: false,
    winners: [],
    log: ['Nueva mano. Ciegas posteadas.'],
  };
}

function post(pl: Player, amount: number) {
  const a = Math.min(amount, pl.stack);
  pl.stack -= a;
  pl.bet += a;
  if (pl.stack === 0) pl.allIn = true;
}

// jugadores que aún pueden actuar (no folded, no all-in)
function actable(g: Game) {
  return g.players.filter((p) => !p.folded && !p.allIn);
}
function inHand(g: Game) {
  return g.players.filter((p) => !p.folded);
}

export interface LegalActions {
  canCheck: boolean;
  callAmount: number;   // cuánto falta para igualar
  minRaiseTo: number;   // monto total al que subir como mínimo
  maxRaiseTo: number;   // all-in
  canRaise: boolean;
}

export function legalActions(g: Game): LegalActions {
  const p = g.players[g.toAct];
  const callAmount = Math.max(0, g.currentBet - p.bet);
  const maxRaiseTo = p.bet + p.stack;
  const minRaiseTo = Math.min(maxRaiseTo, g.currentBet + g.minRaise);
  return {
    canCheck: callAmount === 0,
    callAmount: Math.min(callAmount, p.stack),
    minRaiseTo,
    maxRaiseTo,
    canRaise: maxRaiseTo > g.currentBet,
  };
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; to: number }; // total al que llevar la apuesta

export function applyAction(game: Game, action: Action): Game {
  const g: Game = structuredCloneGame(game);
  const p = g.players[g.toAct];
  const la = legalActions(g);

  if (action.type === 'fold') {
    p.folded = true;
    p.lastAction = 'Se retiró';
    g.log.push(`${p.name} se retiró.`);
  } else if (action.type === 'check') {
    p.lastAction = 'Pasó';
    g.log.push(`${p.name} pasó.`);
  } else if (action.type === 'call') {
    const amt = la.callAmount;
    post(p, amt);
    p.lastAction = amt > 0 ? 'Igualó' : 'Pasó';
    g.log.push(`${p.name} igualó ⟡${amt}.`);
  } else if (action.type === 'raise') {
    const to = Math.max(la.minRaiseTo, Math.min(action.to, la.maxRaiseTo));
    const add = to - p.bet;
    g.minRaise = Math.max(g.minRaise, to - g.currentBet);
    post(p, add);
    g.currentBet = Math.max(g.currentBet, p.bet);
    p.lastAction = 'Subió';
    g.log.push(`${p.name} subió a ⟡${to}.`);
    // reabrir acción: los demás deben volver a actuar
    for (const o of g.players) if (o !== p && !o.folded && !o.allIn) o.acted = false;
  }
  p.acted = true;

  return advance(g);
}

function advance(g: Game): Game {
  // ¿queda solo uno? gana sin showdown
  if (inHand(g).length === 1) {
    collectBets(g);
    awardSinglePot(g, [inHand(g)[0]]);
    g.phase = 'done';
    g.handOver = true;
    return g;
  }

  // ¿ronda de apuestas terminada?
  const pendientes = actable(g).filter((p) => !p.acted || p.bet < g.currentBet);
  if (pendientes.length > 0) {
    // siguiente que deba actuar
    g.toAct = nextActor(g, g.toAct);
    return g;
  }

  // ronda terminada -> recoger apuestas y avanzar calle
  collectBets(g);
  // si solo queda 0 o 1 jugador que pueda actuar (resto all-in), correr hasta el final
  if (actable(g).length <= 1) {
    runOutBoard(g);
    return showdown(g);
  }

  if (g.phase === 'preflop') { dealBoard(g, 3); g.phase = 'flop'; }
  else if (g.phase === 'flop') { dealBoard(g, 1); g.phase = 'turn'; }
  else if (g.phase === 'turn') { dealBoard(g, 1); g.phase = 'river'; }
  else if (g.phase === 'river') { return showdown(g); }

  // nueva ronda
  for (const p of g.players) { p.acted = false; }
  g.currentBet = 0;
  g.minRaise = g.bb;
  g.toAct = nextActor(g, g.dealer);
  return g;
}

function nextActor(g: Game, from: number): number {
  for (let k = 1; k <= g.players.length; k++) {
    const idx = (from + k) % g.players.length;
    const p = g.players[idx];
    if (!p.folded && !p.allIn) return idx;
  }
  return from;
}

function collectBets(g: Game) {
  for (const p of g.players) { g.pot += p.bet; p.bet = 0; }
}

function dealBoard(g: Game, n: number) {
  for (let i = 0; i < n; i++) g.board.push(g.deck.pop()!);
}
function runOutBoard(g: Game) {
  while (g.board.length < 5) g.board.push(g.deck.pop()!);
}

function showdown(g: Game): Game {
  const contenders = inHand(g);
  const scored = contenders.map((p) => ({ p, score: evaluate7([...p.hole, ...g.board]) }));
  const best = Math.max(...scored.map((s) => s.score));
  const winners = scored.filter((s) => s.score === best).map((s) => s.p);
  awardSinglePot(g, winners);
  for (const s of scored) s.p.lastAction = HAND_NAME(handCategory(s.score));
  g.phase = 'showdown';
  g.handOver = true;
  return g;
}

function awardSinglePot(g: Game, winners: Player[]) {
  const share = Math.floor(g.pot / winners.length);
  let rem = g.pot - share * winners.length;
  g.winners = [];
  for (const w of winners) {
    let amt = share;
    if (rem > 0) { amt += 1; rem -= 1; }
    w.stack += amt;
    g.winners.push({ id: w.id, amount: amt });
  }
  g.log.push(`Gana ${winners.map((w) => w.name).join(', ')} ⟡${g.pot}.`);
  g.pot = 0;
}

function structuredCloneGame(g: Game): Game {
  return {
    ...g,
    players: g.players.map((p) => ({ ...p, hole: [...p.hole] })),
    board: [...g.board],
    deck: [...g.deck],
    winners: [...g.winners],
    log: [...g.log],
  };
}

// ---------- IA de bots ----------
// Fuerza aproximada 0..1 según fase.
function strength(g: Game, p: Player): number {
  if (g.board.length === 0) {
    // preflop: valor simple de las 2 cartas
    const [a, b] = p.hole;
    const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r);
    let s = (hi - 2) / 12 * 0.5 + (lo - 2) / 12 * 0.2;
    if (a.r === b.r) s += 0.35;             // par
    if (a.s === b.s) s += 0.06;             // suited
    if (hi - lo === 1) s += 0.05;           // conectores
    return Math.min(1, s);
  }
  // postflop: categoría de la mejor mano actual
  const cat = handCategory(evaluate7([...p.hole, ...g.board]));
  return Math.min(1, 0.18 + cat * 0.12);
}

export function botAction(g: Game): Action {
  const p = g.players[g.toAct];
  const la = legalActions(g);
  let s = strength(g, p);
  // ajuste por estilo
  if (p.style === 'agresivo') s += 0.12;
  if (p.style === 'conservador') s -= 0.1;
  const r = Math.random();

  // sin apuesta que igualar
  if (la.canCheck) {
    if (s > 0.55 && la.canRaise && r < 0.6) {
      const sizing = g.pot > 0 ? g.pot * (0.4 + Math.random() * 0.5) : g.bb * 3;
      return { type: 'raise', to: Math.round(p.bet + Math.max(g.bb, sizing)) };
    }
    return { type: 'check' };
  }

  // hay que pagar
  const potOdds = la.callAmount / (g.pot + la.callAmount || 1);
  if (s < 0.28 && potOdds > 0.15 && r < 0.85) return { type: 'fold' };
  if (s > 0.7 && la.canRaise && r < 0.5) {
    const sizing = (g.pot + la.callAmount) * (0.5 + Math.random() * 0.6);
    return { type: 'raise', to: Math.round(g.currentBet + Math.max(g.minRaise, sizing)) };
  }
  // farol ocasional
  if (s < 0.3 && la.canRaise && r > 0.93) {
    return { type: 'raise', to: Math.round(g.currentBet + g.minRaise) };
  }
  return { type: 'call' };
}
