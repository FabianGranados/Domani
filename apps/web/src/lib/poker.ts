// ============================================================
// Motor de Texas Hold'em (vs bots) — lógica pura, client-side.
// Fase de pruebas: 1 humano + bots. Solo Aurelios (fantasía).
// Nota: usa un único bote (sin side-pots completos) — suficiente
// para jugar/probar vs bots; se endurecerá en multijugador real.
// ============================================================

import type { BrainSpec } from './brains';

export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card { r: number; s: Suit } // r: 2..14 (11=J,12=Q,13=K,14=A)
export type Phase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'done';
export type BotStyle = 'agresivo' | 'conservador' | 'normal';

export interface Player {
  id: string;
  name: string;
  avatar?: string;   // avatar_code del ciudadano (para mostrar su cara)
  isBot: boolean;
  style: BotStyle;
  stack: number;
  bet: number;       // fichas apostadas en esta ronda
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  acted: boolean;    // ya actuó en esta ronda de apuestas
  lastAction?: string;
  // Estado emocional persistente y opcional (tilt). La UI no necesita
  // crearlo: si falta, se trata como 0. Aumenta con malas rachas y
  // hace que el bot juegue algo más suelto/agresivo por un rato.
  tilt?: number;
  // --- Cerebro (opcional) ---
  // Si se provee, el motor usa esta persona en vez de derivarla del hash.
  // Así un ciudadano con cerebro (arquetipo) juega según su personalidad.
  persona?: BotPersona;
  // Propensión a tiltearse (0..1). El Don ~0.08, el Tilteado ~0.92. Si falta,
  // se usa un valor medio. Controla cuánto se calienta al perder un bote.
  tiltProne?: number;
  // Key del arquetipo (para la voz y observabilidad). No afecta la lógica.
  brainKey?: string;
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
  const pot = g.pot;
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
  // --- Tilt: actualización emocional opcional para los bots ---
  // Cada bote resuelto: los perdedores que invirtieron fichas en un
  // bote relevante se "calientan" un poco; los demás se enfrían. El
  // tilt se queda guardado en el Player y persiste entre manos.
  const winnerIds = new Set(winners.map((w) => w.id));
  for (const pl of g.players) {
    if (!pl.isBot) continue;
    const prone = pl.tiltProne ?? 0.4; // propensión del arquetipo
    const cur = pl.tilt ?? 0;
    // los temperamentales decaen más lento; los fríos se calman rápido
    let next = cur * (0.70 - prone * 0.25);
    if (!winnerIds.has(pl.id) && pot > 0) {
      // perder un bote grande respecto al stack calienta más, escalado por prone
      const ref = Math.max(g.bb * 10, pl.stack + 1);
      const sev = Math.min(1, pot / ref);
      next += (0.15 + 0.85 * prone) * sev;
    }
    pl.tilt = Math.max(0, Math.min(1, next));
  }
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

// ============================================================
// IA de bots — "ciudadanos" con personalidad.
// Cada bot deriva un vector de personalidad determinista a partir de
// su identidad (hash estable de id/name) sesgado por su `style`. Con
// eso juega preflop con conciencia de posición y disciplina de fold,
// y postflop según la categoría de mano vs. pot odds, con faroles y
// tamaños de apuesta propios. No es un solver: es humano e imperfecto.
// ============================================================

// Hash determinista 32-bit (FNV-1a) de una cadena -> entero sin signo.
function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// PRNG determinista (mulberry32) a partir de una semilla entera.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BotPersona {
  tightness: number;   // 0 = jugón de todo, 1 = nit (selectivo preflop)
  aggression: number;  // 0 = pasivo, 1 = sube/apuesta mucho
  bluff: number;       // frecuencia base de farol
  station: number;     // tendencia a pagar (calling station)
  risk: number;        // tolerancia al riesgo / tamaño de apuestas
}

// Deriva la personalidad de un bot de forma determinista. Estable entre
// manos porque depende solo de id/name + style (no de estado mutable).
// Mapea un cerebro (arquetipo) a la persona de póker del motor. Determinista.
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function pokerPersonaFromBrain(b: BrainSpec): BotPersona {
  return {
    // disciplina sube tightness; codicia la baja (Roca nit, Ludópata jugona)
    tightness: clamp01(0.25 + b.fortalezas.disciplina * 0.5 - b.debilidades.codicia * 0.35),
    aggression: clamp01(b.estilo.agresividad),
    bluff: clamp01(0.04 + b.estilo.farol * 0.42),
    // calling station = paga todo: codicia + indisciplina (Ludópata altísimo)
    station: clamp01(0.12 + b.debilidades.codicia * 0.6 + (1 - b.fortalezas.disciplina) * 0.2),
    risk: clamp01(b.estilo.riesgo),
  };
}

function persona(p: Player): BotPersona {
  if (p.persona) return p.persona; // cerebro provisto: úsalo tal cual
  const seed = hashStr(`${p.id}|${p.name}`);
  const rnd = mulberry32(seed);
  // base aleatoria pero estable
  let tightness = 0.30 + rnd() * 0.55;   // 0.30..0.85
  let aggression = 0.20 + rnd() * 0.65;  // 0.20..0.85
  let bluff = 0.04 + rnd() * 0.24;       // 0.04..0.28
  let station = 0.10 + rnd() * 0.55;     // 0.10..0.65
  let risk = 0.30 + rnd() * 0.55;        // 0.30..0.85

  // Sesgo por estilo declarado en la UI.
  if (p.style === 'agresivo') {
    aggression = Math.min(1, aggression + 0.20);
    bluff = Math.min(0.5, bluff + 0.10);
    risk = Math.min(1, risk + 0.15);
    tightness = Math.max(0.15, tightness - 0.12);
  } else if (p.style === 'conservador') {
    aggression = Math.max(0.05, aggression - 0.18);
    bluff = Math.max(0.01, bluff - 0.07);
    tightness = Math.min(0.95, tightness + 0.18);
    risk = Math.max(0.1, risk - 0.12);
  }
  return { tightness, aggression, bluff, station, risk };
}

// ---------- Fuerza de mano ----------
// Preflop: puntuación tipo "Chen" normalizada a 0..1.
function preflopStrength(a: Card, b: Card): number {
  const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r);
  const pair = a.r === b.r;
  const suited = a.s === b.s;
  const gap = hi - lo;

  // valor de la carta más alta (escala Chen aproximada)
  const chenVal = (r: number): number => {
    if (r === 14) return 10;       // As
    if (r === 13) return 8;        // K
    if (r === 12) return 7;        // Q
    if (r === 11) return 6;        // J
    return r / 2;                  // 10 -> 5, etc.
  };

  let pts: number;
  if (pair) {
    pts = Math.max(5, chenVal(hi) * 2); // pares: doble valor, mínimo 5 (22)
  } else {
    pts = chenVal(hi);
    if (suited) pts += 2;
    // penalización por hueco
    if (gap === 1) pts += 1;       // conectores
    else if (gap === 2) pts -= 1;
    else if (gap === 3) pts -= 2;
    else if (gap >= 4) pts -= 4;
    // bonus conectores bajos
    if (gap <= 1 && hi <= 11) pts += 1;
  }
  // Chen va de ~ -1 (72o) a 20 (AA). Normalizar a 0..1.
  return Math.max(0, Math.min(1, (pts + 1) / 21));
}

// Fuerza aproximada 0..1 según fase (made hand postflop).
function strength(g: Game, p: Player): number {
  if (g.board.length === 0) {
    const [a, b] = p.hole;
    return preflopStrength(a, b);
  }
  const cat = handCategory(evaluate7([...p.hole, ...g.board]));
  // cat: 0 carta alta .. 8 escalera de color. Mapear a 0..1.
  return Math.min(1, 0.10 + cat * 0.115);
}

// Conciencia de draws: ¿tenemos proyecto de color o escalera abierto?
// Devuelve un bonus 0..~0.25 a sumar a la fuerza para decidir continuar.
function drawBonus(g: Game, p: Player): number {
  if (g.board.length < 3 || g.board.length >= 5) return 0;
  const cards = [...p.hole, ...g.board];
  // flush draw: 4 del mismo palo
  const bySuit: Record<string, number> = {};
  for (const c of cards) bySuit[c.s] = (bySuit[c.s] || 0) + 1;
  const flushDraw = Object.values(bySuit).some((n) => n === 4);
  // straight draw: ventana de 5 rangos con 4 presentes
  const set = new Set(cards.map((c) => c.r));
  if (set.has(14)) set.add(1); // As bajo
  let straightDraw = false;
  for (let lo = 1; lo <= 10; lo++) {
    let cnt = 0;
    for (let k = 0; k < 5; k++) if (set.has(lo + k)) cnt++;
    if (cnt === 4) { straightDraw = true; break; }
  }
  let bonus = 0;
  if (flushDraw) bonus += 0.18;
  if (straightDraw) bonus += 0.14;
  return Math.min(0.28, bonus);
}

// ---------- Posición ----------
// 0 = peor (ciega pequeña / fuera de posición), 1 = mejor (botón / cerca).
// Se mide por cuántos jugadores activos actúan DESPUÉS de este bot.
function positionScore(g: Game): number {
  const n = g.players.length;
  const active = g.players.filter((pl) => !pl.folded).length;
  if (active <= 1) return 1;
  let after = 0;
  for (let k = 1; k < n; k++) {
    const idx = (g.toAct + k) % n;
    const pl = g.players[idx];
    if (!pl.folded && !pl.allIn && idx !== g.toAct) after++;
  }
  // menos jugadores por detrás = mejor posición
  return 1 - after / Math.max(1, active - 1);
}

// Clampa y redondea una subida legal a un total válido.
function raiseTo(_g: Game, la: LegalActions, desiredTotal: number): Action {
  const to = Math.max(la.minRaiseTo, Math.min(Math.round(desiredTotal), la.maxRaiseTo));
  return { type: 'raise', to };
}

export function botAction(g: Game): Action {
  const p = g.players[g.toAct];
  const la = legalActions(g);
  const per = persona(p);
  // PRNG por decisión: determinista por bot+mano+fase+apuesta, pero
  // variado entre situaciones. Mantiene reproducibilidad y variedad.
  const rng = mulberry32(
    hashStr(`${p.id}|${g.phase}|${g.board.length}|${Math.round(g.pot)}|${Math.round(g.currentBet)}|${Math.round(p.bet)}`)
  );
  const tilt = p.isBot ? (p.tilt ?? 0) : 0;

  const raw = strength(g, p);

  if (g.board.length === 0) {
    return preflopDecision(g, p, la, per, raw, tilt, rng);
  }
  return postflopDecision(g, p, la, per, raw, tilt, rng);
}

// ---------- Preflop ----------
function preflopDecision(
  g: Game, _p: Player, la: LegalActions, per: BotPersona,
  raw: number, tilt: number, rng: () => number,
): Action {
  const pos = positionScore(g);          // 0..1
  // Umbral de juego: más alto = más selectivo. La posición lo relaja.
  // Tilt afloja la selección (juega más manos).
  let playThresh = 0.26 + per.tightness * 0.26 - pos * 0.14 - tilt * 0.10;
  playThresh = Math.max(0.14, Math.min(0.66, playThresh));

  const facingRaise = g.currentBet > g.bb + 0.5; // alguien ya subió
  const premium = raw > 0.78;                    // ~AQ+/TT+/AKs
  const strong = raw > 0.58;                     // manos de apertura sólidas
  const playable = raw > playThresh;
  const speculative = !playable && raw > playThresh - 0.16 && pos > 0.45;

  // ¿Mano basura? Foldear si hay que pagar; pasar si es gratis (BB).
  if (!playable && !speculative) {
    if (la.canCheck) return { type: 'check' };
    return { type: 'fold' };
  }

  // Tamaño de apertura/subida según riesgo (2x..3.5x la apuesta actual).
  const openMult = 2.2 + per.risk * 1.3 + rng() * 0.4;
  const openTotal = g.currentBet * openMult + g.pot * 0.0;
  const threeBetTotal = g.currentBet * (2.6 + per.aggression * 0.9 + rng() * 0.3);

  if (facingRaise) {
    // Frente a una subida: 3-bet con premium, pagar manos fuertes,
    // foldear el resto salvo especulativas baratas en posición.
    const threeBetChance = per.aggression * 0.6 + tilt * 0.2;
    if (premium && la.canRaise && rng() < 0.35 + threeBetChance) {
      return raiseTo(g, la, threeBetTotal);
    }
    const potOdds = la.callAmount / (g.pot + la.callAmount || 1);
    const callOk = strong || (playable && potOdds < 0.33) ||
      (speculative && potOdds < 0.2 && rng() < 0.5);
    if (callOk) return { type: 'call' };
    if (la.canCheck) return { type: 'check' };
    return { type: 'fold' };
  }

  // Sin subida previa (limpers o solo ciegas).
  if (la.canRaise) {
    // Abrir subiendo con manos fuertes; los agresivos abren más ancho.
    const openChance = (strong ? 0.85 : 0.30) * (0.5 + per.aggression) + tilt * 0.15;
    if ((strong || (playable && rng() < per.aggression * 0.5)) && rng() < openChance) {
      return raiseTo(g, la, openTotal);
    }
  }
  // Limp/call con especulativas o manos jugables que no abrimos.
  if (la.canCheck) return { type: 'check' };
  // hay que pagar la ciega: pagar si es jugable, foldear especulativas caras
  const potOdds = la.callAmount / (g.pot + la.callAmount || 1);
  if (playable || (speculative && potOdds < 0.18)) return { type: 'call' };
  return { type: 'fold' };
}

// ---------- Postflop ----------
function postflopDecision(
  g: Game, p: Player, la: LegalActions, per: BotPersona,
  raw: number, tilt: number, rng: () => number,
): Action {
  const draw = drawBonus(g, p);
  const eff = Math.min(1, raw + draw * (0.6 + per.risk * 0.4));
  const cat = handCategory(evaluate7([...p.hole, ...g.board]));

  // Categorías: 0 carta alta, 1 par, 2 doble par, 3 trío, 4 escalera,
  // 5 color, 6 full, 7 póker, 8 escalera de color.
  const madeStrong = cat >= 3;            // trío o mejor: valor fuerte
  const madeMedium = cat === 1 || cat === 2; // par / doble par
  const madeWeak = cat === 0;             // carta alta

  // Tamaño de apuesta según personalidad (0.4x..1.0x el bote aprox).
  const sizeFrac = 0.45 + per.risk * 0.5 + rng() * 0.15;
  const potBet = Math.max(g.bb, Math.round((g.pot) * sizeFrac));

  if (la.canCheck) {
    // Nadie ha apostado: apostar por valor o farol; si no, pasar.
    if (madeStrong) {
      const betChance = 0.55 + per.aggression * 0.4;
      if (la.canRaise && rng() < betChance) {
        return raiseTo(g, la, p.bet + potBet);
      }
      return { type: 'check' };
    }
    if (madeMedium) {
      // a veces apuesta fina/protección, sobre todo agresivos
      if (la.canRaise && rng() < 0.20 + per.aggression * 0.35) {
        return raiseTo(g, la, p.bet + Math.round(potBet * 0.7));
      }
      return { type: 'check' };
    }
    // mano débil o solo proyecto: farol con frecuencia de personalidad
    const semiBluff = draw > 0 ? 0.18 : 0;
    const bluffChance = per.bluff + semiBluff + tilt * 0.12;
    if (la.canRaise && rng() < bluffChance) {
      return raiseTo(g, la, p.bet + Math.round(potBet * (0.6 + per.risk * 0.4)));
    }
    return { type: 'check' };
  }

  // Hay que pagar: comparar fuerza efectiva vs. pot odds.
  const potOdds = la.callAmount / (g.pot + la.callAmount || 1);

  // Valor: subir manos fuertes con frecuencia agresiva.
  if (madeStrong && la.canRaise) {
    const raiseChance = 0.4 + per.aggression * 0.45 + tilt * 0.1;
    if (rng() < raiseChance) {
      const sizing = (g.pot + la.callAmount) * sizeFrac;
      return raiseTo(g, la, g.currentBet + Math.max(g.minRaise, Math.round(sizing)));
    }
    return { type: 'call' };
  }

  // Mano media: pagar si las pot odds son razonables; calling stations
  // pagan más ancho. Foldear ante apuestas grandes con poca fuerza.
  if (madeMedium) {
    const callThresh = 0.30 + per.station * 0.30 - tilt * 0.08;
    if (potOdds < callThresh) return { type: 'call' };
    // apuesta grande: a veces foldear par flojo
    if (rng() < 0.45 - per.station * 0.3) return { type: 'fold' };
    return { type: 'call' };
  }

  // Proyecto fuerte: pagar si las pot odds justifican (semi-bluff o draw).
  if (draw > 0) {
    const drawCallThresh = 0.20 + draw + per.station * 0.15;
    // semi-farol ocasional subiendo el proyecto
    if (la.canRaise && rng() < per.bluff + per.aggression * 0.12) {
      const sizing = (g.pot + la.callAmount) * (0.5 + per.risk * 0.4);
      return raiseTo(g, la, g.currentBet + Math.max(g.minRaise, Math.round(sizing)));
    }
    if (potOdds < drawCallThresh) return { type: 'call' };
    return { type: 'fold' };
  }

  // Mano débil (carta alta) frente a apuesta: foldear casi siempre,
  // con farol-subida ocasional (más en agresivos/maniacs/tilt).
  if (madeWeak) {
    const bluffRaise = per.bluff * 0.6 + tilt * 0.1;
    if (la.canRaise && rng() < bluffRaise) {
      return raiseTo(g, la, g.currentBet + g.minRaise);
    }
    // calling station floja a veces paga apuestas pequeñas
    const stationCall = per.station * 0.35 - per.tightness * 0.2;
    if (potOdds < 0.16 && rng() < stationCall) return { type: 'call' };
    return { type: 'fold' };
  }

  // Fallback seguro: usar fuerza efectiva vs pot odds.
  if (eff > 0.5 || potOdds < 0.2) return { type: 'call' };
  return { type: 'fold' };
}
