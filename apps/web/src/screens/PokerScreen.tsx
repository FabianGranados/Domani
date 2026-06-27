import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, listHouses, pokerBuyin, pokerCashout, getPokerCitizens, avatarSrc } from '../lib/api';
import {
  startHand, applyAction, legalActions, botAction,
  evaluate7, handCategory, HAND_NAME, RANK_LABEL, isRed,
  type Game, type Player, type Card,
} from '../lib/poker';
import { humanPokerDelayMs } from '../lib/humanTiming';
import type { House } from '../lib/types';
import {
  STAKE_LADDER, tablesForHouse, seatedCount, tableRoster,
  type PokerTable, type StakeTierId,
} from '../lib/pokerTables';
import { Carousel } from '../components/Carousel';

// Stakes por defecto (sin mesa elegida): nivel "Media" de la escalera.
const DEFAULT_TIER = STAKE_LADDER.find((t) => t.id === 'media')!;
const SB = DEFAULT_TIER.sb;
const BB = DEFAULT_TIER.bb;

// Banco de frases de mesa para las respuestas de los ciudadanos (sin IA generativa).
const TABLE_QUIPS = [
  'jaja, suerte con esa', 'no me tientes', 'esa la tenía', '¿en serio?', 'tranquilo, ya caerás',
  'bien jugado', 'la mesa está caliente esta noche', 'voy con todo', 'respeto', 'me huele a farol',
  'no te confíes', 'salud por esa', 'qué frío juegas', 'aquí se viene a ganar', 'bienvenido a mi ciudad',
];

const BOTS: { name: string; ring: string; style: Player['style'] }[] = [
  { name: 'Dunia', ring: '#b9c2cc', style: 'conservador' },
  { name: 'Severo', ring: '#9aa3ad', style: 'normal' },
  { name: 'Mira', ring: '#e8e2d0', style: 'agresivo' },
  { name: 'Tobías', ring: '#2fa06a', style: 'normal' },
  { name: 'Kenji', ring: '#c4514c', style: 'agresivo' },
  { name: 'Vael', ring: '#c8814a', style: 'agresivo' },
  { name: 'Lucía', ring: '#3f9d8a', style: 'normal' },
  { name: 'Bruno', ring: '#9aa3ad', style: 'conservador' },
];

// Posiciones de cada asiento alrededor de la mesa (idx 0 = tú, abajo centro).
// {x,y} = avatar sobre el riel; {bx,by} = fichas apostadas sobre el fieltro.
interface SeatPos { x: number; y: number; bx: number; by: number }
const POS: SeatPos[] = [
  { x: 50, y: 89, bx: 50, by: 73 }, // tú
  { x: 20, y: 80, bx: 33, by: 68 }, // Dunia
  { x: 8, y: 49, bx: 26, by: 50 },  // Severo
  { x: 18, y: 18, bx: 31, by: 32 }, // Mira
  { x: 33, y: 14, bx: 40, by: 30 }, // Tobías
  { x: 67, y: 14, bx: 60, by: 30 }, // Kenji
  { x: 82, y: 18, bx: 69, by: 32 }, // Vael
  { x: 92, y: 49, bx: 74, by: 50 }, // Lucía
  { x: 80, y: 80, bx: 67, by: 68 }, // Bruno
];
const RINGS = ['#5fc795', ...BOTS.map((b) => b.ring)];
const POT_X = 50, POT_Y = 58; // centro del bote sobre el fieltro
// Paño de mesa por NIVEL de la mesa (no por Casa). Cada nivel tiene su familia
// de fieltros (4:3, óvalo cenital), y dentro de la familia se elige una
// variante ESTABLE derivada del id de la mesa (mismo nivel => mesas distintas
// pueden verse distinto, pero la misma mesa siempre se ve igual).
const DEFAULT_FELT = '/assets/tables/basica.webp';
const TURN_SECONDS = 20; // tiempo del turno del humano antes de auto check/fold
// Imágenes de cada Casa (ciudad) para la galería de casinos del lobby.
const HOUSE_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.webp', empire: '/assets/casa-empire.webp',
  plata: '/assets/casa-plata.webp', morro: '/assets/casa-morro.webp',
  roma: '/assets/casa-roma.webp', osaka: '/assets/casa-osaka.webp',
  aztlan: '/assets/casa-aztlan.webp',
};
// Familias de fieltro por nivel: nombre base + nº de variantes (1 = sin sufijo).
const FELT_FAMILY: Record<StakeTierId, { base: string; count: number }> = {
  micro: { base: 'basica', count: 1 },
  baja: { base: 'medio', count: 3 },
  media: { base: 'medio-sup', count: 3 },
  alta: { base: 'premium', count: 7 },
};
// Hash determinista (mismo esquema que seatedCount) para elegir variante estable.
function feltHash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}
// Resuelve la ruta del fieltro a partir del nivel de la mesa + su id (variante).
function feltForTable(table: PokerTable | null): string {
  if (!table) return DEFAULT_FELT;
  const fam = FELT_FAMILY[table.tier.id] ?? FELT_FAMILY.micro;
  if (fam.count <= 1) return `/assets/tables/${fam.base}.webp`;
  const variant = 1 + (feltHash(table.id) % fam.count);
  return `/assets/tables/${fam.base}-${variant}.webp`;
}
// onError: si falla el fieltro elegido, cae a 'basica' (sin paño antiguo).
function feltOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.endsWith(DEFAULT_FELT)) return; // ya estamos en el respaldo
  img.src = DEFAULT_FELT;
}
// El crupier reparte desde la bandeja de fichas, borde superior-central del fieltro.
const DEALER_X = 50, DEALER_Y = 16;

// Mesas que llegarán (teaser dentro del menú de mesa). Por ahora no jugables.
const FUTURE_TABLES: { flag: string; name: string; sub: string }[] = [
  { flag: '🇯🇵', name: 'Salón de Tokio', sub: 'Ciegas altas · rivales de Japón' },
  { flag: '🇧🇷', name: 'Mesa de Río', sub: 'Rápida · rivales de Brasil' },
  { flag: '👑', name: 'Mesa VIP', sub: 'Solo por invitación' },
];


function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

function useIsPortrait() {
  const [p, setP] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const h = () => setP(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return p;
}

interface HistItem { n: number; title: string; sub: string; delta: number; youWon: boolean }

// Carta animada (reparto crupier->asiento o descarte asiento->crupier).
interface FlyingCard {
  id: string;
  fromX: number; fromY: number;  // % del stage
  toX: number; toY: number;      // % del stage
  delay: number;                 // ms antes de arrancar
  flight: number;                // ms de vuelo
  face: Card | null;             // null = boca abajo todo el vuelo
  flip?: boolean;                // anima un volteo (rotateY) al final
  flipReverse?: boolean;         // voltea de cara->dorso (descarte del héroe)
  ci?: number;
}

export function PokerScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  // Mesa elegida en el lobby: define ciegas y buy-in de la partida.
  const [table, setTable] = useState<PokerTable | null>(null);
  const activeSB = table?.tier.sb ?? SB;
  const activeBB = table?.tier.bb ?? BB;
  const [wallet, setWallet] = useState<number | null>(null);
  const [houseName, setHouseName] = useState('Bacatá');
  // Casa elegida en el lobby: define el paño de la mesa (por código) y el
  // acento de color en juego. undefined => paño por defecto.
  const [houseColor, setHouseColor] = useState<string | undefined>(undefined);
  // Fieltro de la mesa, elegido por nivel + variante estable al sentarse.
  const [feltPath, setFeltPath] = useState<string>(DEFAULT_FELT);
  // Lobby: lista de Casas (DB) y Casa seleccionada (null = ver casinos).
  const [houses, setHouses] = useState<House[]>([]);
  const [lobbyHouse, setLobbyHouse] = useState<House | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [dealer, setDealer] = useState(0);
  const [raiseAmt, setRaiseAmt] = useState(BB * 2);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [fly, setFly] = useState<{ x: number; y: number; fromX: number; fromY: number; amount: number; key: number } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  // Chat de la mesa (escribes y los ciudadanos responden).
  const [chat, setChat] = useState<{ id: number; who: string; mine: boolean; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatIdRef = useRef(1);
  // ¿Mostraste tus cartas al final de la mano?
  const [youReveal, setYouReveal] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [handKey, setHandKey] = useState(0);
  const [turnLeft, setTurnLeft] = useState<number | null>(null);
  // Cartas volando: reparto (crupier -> asiento) y descarte/fold (asiento -> crupier).
  const [dealCards, setDealCards] = useState<FlyingCard[]>([]);
  const [muckCards, setMuckCards] = useState<FlyingCard[]>([]);
  // Modo pruebas (solo admin): ver las cartas de TODOS, incluso de quien se
  // retira, para analizar qué manos foldean / farolean. No afecta la lógica.
  const [debugReveal, setDebugReveal] = useState(false);
  const foldedRef = useRef<boolean[]>([]);
  const muckSeqRef = useRef(0);
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  const cashedRef = useRef(false);
  const handNoRef = useRef(1283);
  // En pruebas, arranca con cartas abiertas para el admin.
  useEffect(() => { if (profile?.is_admin) setDebugReveal(true); }, [profile?.is_admin]);
  const startStackRef = useRef(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setWallet(w?.balance ?? 0));
    listHouses().then((hs) => {
      setHouses(hs);
      // La ciudad ya se eligió en el onboarding: entras directo al casino de TU
      // ciudad, sin volver a escogerla.
      const mine = hs.find((h) => h.id === profile?.house_id) ?? hs[0] ?? null;
      setHouseName(mine?.name.replace(/^Casa /, '') ?? 'Bacatá');
      setLobbyHouse(mine);
    });
  }, [user, profile?.house_id]);

  async function sentarse(t: PokerTable, house: House) {
    setBusy(true); setError(null);
    const stack = t.tier.buyin;
    try {
      const bal = await pokerBuyin(stack);
      setWallet(bal);
      setTable(t);
      setHouseName(house.name.replace(/^Casa /, ''));
      setHouseColor(house.color_primary ?? undefined);
      setFeltPath(feltForTable(t));
      // Sienta CIUDADANOS reales de tu ciudad (con su cara). Si no hay, usa los de respaldo.
      const cits = await getPokerCitizens(house.id, 7).catch(() => []);
      const styles: Player['style'][] = ['conservador', 'normal', 'agresivo'];
      const botPlayers: Player[] = cits.length
        ? cits.map((c, i) => ({ id: c.id, name: c.alias, avatar: c.avatar_code, isBot: true, style: styles[(i + Math.floor(Math.random() * 3)) % 3], stack, bet: 0, hole: [] as Card[], folded: false, allIn: false, acted: false }))
        : BOTS.map((b) => ({ id: b.name, name: b.name, isBot: true, style: b.style, stack, bet: 0, hole: [] as Card[], folded: false, allIn: false, acted: false }));
      const players: Player[] = [
        { id: 'you', name: profile?.alias ?? 'Tú', avatar: profile?.avatar_code, isBot: false, style: 'normal', stack, bet: 0, hole: [], folded: false, allIn: false, acted: false },
        ...botPlayers,
      ];
      chatIdRef.current = 1;
      setChat([{ id: 0, who: 'Crupier', mine: false, text: `Bienvenido a la mesa, ${profile?.alias ?? 'jugador'}. Saluda a los presentes.` }]);
      setYouReveal(false);
      const d = Math.floor(Math.random() * players.length);
      setDealer(d);
      startStackRef.current = stack;
      recordedRef.current = false;
      setHistory([]);
      handNoRef.current = 1283;
      setGame(startHand(players, d, t.tier.sb, t.tier.bb));
      setHandKey((k) => k + 1);
      cashedRef.current = false;
      setPhase('playing');
      try { await document.documentElement.requestFullscreen?.(); } catch { /* iOS/desktop ignore */ }
      try { await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape'); } catch { /* iOS/desktop ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sentar');
    } finally { setBusy(false); }
  }

  async function levantarse() {
    if (!cashedRef.current) {
      cashedRef.current = true;
      const youStack = game?.players.find((p) => p.id === 'you')?.stack ?? 0;
      try { const bal = await pokerCashout(youStack); setWallet(bal); await refreshProfile(); } catch { /* noop */ }
    }
    try { (screen.orientation as unknown as { unlock: () => void }).unlock(); } catch { /* not supported */ }
    try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch { /* noop */ }
    // Salir de la mesa vuelve al LOBBY de mesas (no al Casino). Desde el lobby
    // el usuario puede salir al Salón si quiere.
    setGame(null);
    setPhase('lobby');
  }

  function nextHand() {
    if (!game) return;
    const alive = game.players.filter((p) => p.stack > 0).length;
    if (alive < 2) { levantarse(); return; }
    const nd = (dealer + 1) % game.players.length;
    setDealer(nd);
    startStackRef.current = game.players.find((p) => p.id === 'you')?.stack ?? 0;
    recordedRef.current = false;
    setYouReveal(false);
    setGame(startHand(game.players, nd, activeSB, activeBB));
    setHandKey((k) => k + 1);
  }

  // Chat de la mesa: escribes y los ciudadanos responden (con sabor, sin IA generativa).
  function sendChat() {
    const text = chatInput.trim();
    if (!text || !game) return;
    setChatInput('');
    const meName = profile?.alias ?? 'Tú';
    setChat((c) => [...c, { id: chatIdRef.current++, who: meName, mine: true, text }]);
    const bots = game.players.filter((p) => p.isBot && !p.folded);
    if (!bots.length) return;
    const replies = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < replies; i++) {
      const b = bots[Math.floor(Math.random() * bots.length)];
      const q = TABLE_QUIPS[Math.floor(Math.random() * TABLE_QUIPS.length)];
      const txt = Math.random() < 0.3 ? `${meName}, ${q}` : q;
      window.setTimeout(() => setChat((c) => [...c, { id: chatIdRef.current++, who: b.name, mine: false, text: txt }]), 600 + i * 900 + Math.random() * 800);
    }
  }

  function mostrarCartas() {
    setYouReveal(true);
    setChat((c) => [...c, { id: chatIdRef.current++, who: 'Crupier', mine: false, text: `${profile?.alias ?? 'El jugador'} mostró sus cartas.` }]);
  }

  // Bots juegan en automático
  useEffect(() => {
    if (!game || game.handOver || dealing) return;
    const cur = game.players[game.toAct];
    if (cur.isBot && !cur.folded && !cur.allIn) {
      // Ritmo humano: variable, más lento, se tanquea en spots difíciles.
      const la = legalActions(game);
      const wait = humanPokerDelayMs({
        toCall: la.callAmount, pot: game.pot, stack: cur.stack,
        street: game.board.length, canCheck: la.canCheck,
      });
      const t = setTimeout(() => {
        setGame((g) => (g && !g.handOver && g.players[g.toAct].isBot ? applyAction(g, botAction(g)) : g));
      }, wait);
      return () => clearTimeout(t);
    }
  }, [game, dealing]);

  // Turno del humano: cuenta regresiva visible. Si no actúa a tiempo, se
  // auto-resuelve (check o fold) para que la mesa no se congele esperándolo.
  useEffect(() => {
    if (!game || game.handOver || dealing || game.players[game.toAct].id !== 'you') {
      setTurnLeft(null);
      return;
    }
    setTurnLeft(TURN_SECONDS);
    const iv = setInterval(() => setTurnLeft((s) => (s && s > 0 ? s - 1 : 0)), 1000);
    const to = setTimeout(() => {
      setGame((g) => {
        if (!g || g.handOver || g.players[g.toAct].id !== 'you') return g;
        const a = legalActions(g);
        return applyAction(g, a.canCheck ? { type: 'check' } : { type: 'fold' });
      });
    }, TURN_SECONDS * 1000);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [game, dealing]);

  // Reparto: al iniciar cada mano, el crupier (arriba-centro) reparte cada
  // carta hacia su asiento, en orden real (CP primero, en sentido horario,
  // y luego una segunda vuelta). Las del héroe se voltean boca arriba al caer.
  useEffect(() => {
    if (handKey === 0 || !game) return;
    // Reinicia el seguimiento de folds para la nueva mano (los sin fichas ya van folded).
    foldedRef.current = game.players.map((p) => p.folded);
    setMuckCards([]);

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const np = game.players.length;
    // Orden de reparto desde el dealer+1 (ciega pequeña), solo jugadores activos.
    const order: number[] = [];
    for (let k = 1; k <= np; k++) {
      const idx = (game.dealer + k) % np;
      if (!game.players[idx].folded) order.push(idx);
    }
    const STEP = reduce ? 0 : 120;       // ms entre cartas (más lento: se nota mejor)
    const FLIGHT = reduce ? 0 : 820;     // duración del vuelo
    const FLIP = reduce ? 0 : 820;       // duración del volteo del héroe
    const cards: FlyingCard[] = [];
    let n = 0;
    for (let ci = 0; ci < 2; ci++) {
      for (const idx of order) {
        const isHero = idx === 0;
        cards.push({
          id: `deal-${handKey}-${idx}-${ci}`,
          fromX: DEALER_X, fromY: DEALER_Y,
          toX: POS[idx].x, toY: POS[idx].y,
          delay: n * STEP,
          flight: FLIGHT,
          face: isHero && game.players[0].hole[ci] ? game.players[0].hole[ci] : null,
          flip: isHero,
          ci,
        });
        n += 1;
      }
    }
    setDealing(true);
    setDealCards(cards);
    const total = (n > 0 ? (n - 1) * STEP : 0) + FLIGHT + FLIP + 80;
    const tDone = setTimeout(() => setDealing(false), total);
    const tClear = setTimeout(() => setDealCards([]), total + 60);
    return () => { clearTimeout(tDone); clearTimeout(tClear); };
  }, [handKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Descarte (muck): cuando alguien se retira, sus 2 cartas vuelan al crupier y
  // se desvanecen. Detectamos la transición folded false->true por asiento.
  useEffect(() => {
    if (!game) return;
    const prev = foldedRef.current;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const added: FlyingCard[] = [];
    game.players.forEach((p, idx) => {
      const wasFolded = prev[idx] ?? false;
      if (p.folded && !wasFolded) {
        // No animar los que arrancan sin fichas (ya folded al repartir).
        const seq = muckSeqRef.current++;
        const isHero = idx === 0;
        for (let ci = 0; ci < 2; ci++) {
          added.push({
            id: `muck-${seq}-${idx}-${ci}`,
            fromX: POS[idx].x, fromY: POS[idx].y,
            toX: DEALER_X, toY: DEALER_Y,
            delay: ci * (reduce ? 0 : 70),
            flight: reduce ? 0 : 480,
            face: isHero && p.hole[ci] ? p.hole[ci] : null,
            flip: isHero,        // héroe voltea boca abajo al irse
            flipReverse: isHero, // (de cara a dorso)
            ci,
          });
        }
      }
    });
    foldedRef.current = game.players.map((p) => p.folded);
    if (added.length) {
      setMuckCards((m) => [...m, ...added]);
      const total = (reduce ? 0 : 70) + (reduce ? 0 : 480) + 120;
      const ids = new Set(added.map((c) => c.id));
      const t = setTimeout(() => setMuckCards((m) => m.filter((c) => !ids.has(c.id))), total);
      return () => clearTimeout(t);
    }
  }, [game]);

  // Mantener la pantalla encendida mientras juegas (como un video).
  // Screen Wake Lock API; se re-adquiere al volver a la pestaña.
  useEffect(() => {
    if (phase !== 'playing') return;
    type WakeSentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeSentinel> } };
    if (!nav.wakeLock) return;
    let sentinel: WakeSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      nav.wakeLock!.request('screen').then((s) => { if (cancelled) s.release(); else sentinel = s; }).catch(() => { /* sin permiso */ });
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible' && !sentinel) acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => { /* noop */ });
    };
  }, [phase]);

  // Fin de mano: animar fichas al ganador + registrar historial + repartir sola
  useEffect(() => {
    if (!game) return;
    if (game.handOver && !recordedRef.current && game.winners.length) {
      recordedRef.current = true;
      const w = game.winners[0];
      const idx = game.players.findIndex((p) => p.id === w.id);
      const total = game.winners.reduce((s, x) => s + x.amount, 0);
      if (idx >= 0) setFly({ x: POS[idx].x, y: POS[idx].y, fromX: POT_X, fromY: POT_Y, amount: total, key: Date.now() });
      const winner = game.players[idx];
      const youWon = game.winners.some((x) => x.id === 'you');
      const you = game.players.find((p) => p.id === 'you')!;
      const delta = you.stack - startStackRef.current;
      const sub = game.phase === 'showdown' && winner?.lastAction ? winner.lastAction : 'Se llevó el bote';
      setHistory((h) => [
        { n: handNoRef.current, title: youWon ? 'Ganaste tú' : `Ganó ${winner?.name ?? '—'}`, sub, delta, youWon },
        ...h,
      ].slice(0, 8));
      handNoRef.current += 1;
      const tFly = setTimeout(() => setFly(null), 1300);
      // El crupier reparte la siguiente mano solo (como en vivo). Si te
      // quedaste sin fichas, no auto-avanza: se ofrece salir.
      const youAlive = (game.players.find((p) => p.id === 'you')?.stack ?? 0) > 0;
      const reveal = game.phase === 'showdown';
      const tNext = youAlive ? setTimeout(() => nextHand(), reveal ? 3400 : 2200) : undefined;
      return () => { clearTimeout(tFly); if (tNext) clearTimeout(tNext); };
    }
    if (!game.handOver) setFly(null);
  }, [game?.handOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Lobby: casinos por Casa -> mesas ----------
  if (phase === 'lobby') {
    return (
      <PokerLobby
        houses={houses}
        wallet={wallet}
        lobbyHouse={lobbyHouse}
        setLobbyHouse={setLobbyHouse}
        busy={busy}
        error={error}
        onSit={sentarse}
        onExit={() => navigate('/casino')}
      />
    );
  }

  if (!game) return null;
  const you = game.players.find((p) => p.id === 'you')!;
  const reveal = game.phase === 'showdown' || game.phase === 'done';
  const yourTurn = !game.handOver && game.players[game.toAct].id === 'you';
  const la = yourTurn ? legalActions(game) : null;
  const youHandLabel = game.board.length >= 3 && you.hole.length === 2
    ? HAND_NAME(handCategory(evaluate7([...you.hole, ...game.board])))
    : null;
  const winnerIdx = game.handOver && game.winners[0] ? game.players.findIndex((p) => p.id === game.winners[0].id) : -1;

  // clamp raise slider
  const minR = la ? la.minRaiseTo : activeBB * 2;
  const maxR = la ? la.maxRaiseTo : activeBB * 2;
  const rAmt = Math.min(maxR, Math.max(minR, raiseAmt));
  const setPreset = (frac: number) => setRaiseAmt(Math.min(maxR, Math.max(minR, Math.round(game.currentBet + (game.pot + (la?.callAmount ?? 0)) * frac))));

  // Durante el reparto, las cartas "estáticas" del asiento se ocultan: el
  // movimiento real lo hace la capa de cartas volando (dealCards). Cuando el
  // reparto termina, aparecen normalmente (rivales = dorso, héroe = cara).
  const holeCardStyle: React.CSSProperties | undefined = dealing ? { opacity: 0 } : undefined;

  // Capa de cartas volando (reparto + descarte), reutilizable en ambos
  // escenarios (móvil y escritorio). El stage es position:relative, así que
  // los % de left/top mapean igual que POS.
  function renderTableExtras(deckSize: number, cardW: number) {
    return (
      <>
        {/* mazo del crupier (arriba-centro) — sutil, presente toda la mano */}
        <DealerDeck size={deckSize} />
        {/* cartas volando: reparto */}
        {dealCards.map((c) => <FlyCard key={c.id} c={c} w={cardW} />)}
        {/* cartas volando: descarte al muck */}
        {muckCards.map((c) => <FlyCard key={c.id} c={c} w={cardW} fade />)}
      </>
    );
  }

  // Controles (compartidos entre escritorio y móvil)
  function renderControls() {
    if (dealing) {
      return (
        <div style={{ textAlign: 'center', width: '100%', color: 'rgba(232,226,212,.55)', fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', letterSpacing: '.04em' }}>
          Repartiendo…
        </div>
      );
    }
    if (game!.handOver) {
      return (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ color: '#ecd9a5', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 10 }}>
            {game!.winners.some((w) => w.id === 'you')
              ? `Te llevas el bote · +⟡${game!.winners.find((w) => w.id === 'you')!.amount.toLocaleString()}`
              : `Ganó ${game!.players[winnerIdx]?.name ?? '—'}`}
          </div>
          {/* Mostrar/ocultar tus cartas al final, si quieres */}
          {you.hole.length === 2 && (
            <div style={{ marginBottom: 8 }}>
              {youReveal
                ? <span style={{ fontSize: 12, color: '#7fb89a' }}>Mostraste tus cartas ✓</span>
                : <button onClick={mostrarCartas} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.12)', color: '#ecd9a5', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Mostrar mis cartas</button>}
            </div>
          )}
          {you.stack > 0
            ? <div style={{ fontSize: 12, color: 'rgba(232,226,212,.45)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif" }}>El crupier reparte la siguiente mano…</div>
            : <button className="btn" style={{ maxWidth: 280, margin: '0 auto' }} onClick={levantarse}>Sin fichas — salir</button>}
        </div>
      );
    }
    if (yourTurn && la) {
      return (
        <>
          {la.canRaise && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPreset(0.5)} style={sizeBtn}>½ Bote</button>
                <button onClick={() => setPreset(1)} style={sizeBtn}>Bote</button>
                <button onClick={() => setRaiseAmt(maxR)} style={{ ...sizeBtn, color: '#ecd9a5', background: 'rgba(201,163,91,.1)', border: '1px solid rgba(201,163,91,.35)' }}>Todo</button>
              </div>
              <input type="range" min={minR} max={maxR} step={activeSB} value={rAmt}
                onChange={(e) => setRaiseAmt(Number(e.target.value))}
                style={{ flex: 1, minWidth: 120, accentColor: '#c9a35b' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 90, justifyContent: 'flex-end' }}>
                <Chip kind="gold" size={16} />
                <span style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#ecd9a5' }}>{rAmt.toLocaleString()}</span>
              </div>
            </div>
          )}
          {turnLeft != null && (
            <div style={{ width: '100%', textAlign: 'center', fontSize: 12, letterSpacing: '.08em', color: turnLeft <= 5 ? '#e0894f' : 'rgba(232,226,212,.55)' }}>
              Tu turno · se resuelve solo en {turnLeft}s
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button onClick={() => setGame(applyAction(game!, { type: 'fold' }))} style={actFold}>Retirarse</button>
            {la.canCheck
              ? <button onClick={() => setGame(applyAction(game!, { type: 'check' }))} style={actCall}>Pasar</button>
              : <button onClick={() => setGame(applyAction(game!, { type: 'call' }))} style={actCall}>Igualar · {la.callAmount.toLocaleString()}</button>}
            {la.canRaise && (
              <button onClick={() => setGame(applyAction(game!, { type: 'raise', to: rAmt }))} style={actRaise}>
                {rAmt >= maxR ? `All-in · ${rAmt.toLocaleString()}` : `Subir a ${rAmt.toLocaleString()}`}
              </button>
            )}
          </div>
        </>
      );
    }
    return (
      <div style={{ textAlign: 'center', width: '100%', color: 'rgba(232,226,212,.5)', fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>
        {game!.players[game!.toAct].name} está pensando…
      </div>
    );
  }

  // Menú de mesa: salir fácil + cambiar de mesa (próximamente). Sin ruido.
  function renderTableMenu(close: () => void) {
    return (
      <>
        <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e' }}>Mesas</div>

        {/* mesa actual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, background: 'rgba(47,160,106,.08)', border: '1px solid rgba(47,160,106,.32)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 18, color: '#eafff4', background: 'linear-gradient(160deg,#2fa06a,#16613f)' }}>{houseName.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#ece6d6' }}>Mesa de {houseName}</div>
            <div style={{ fontSize: 11, color: 'rgba(232,226,212,.55)' }}>{table?.game.name ?? 'Texas Hold’em'} · Ciegas {activeSB}/{activeBB}</div>
          </div>
          <span style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5fc795', border: '1px solid rgba(47,160,106,.4)', borderRadius: 999, padding: '4px 9px' }}>En juego</span>
        </div>

        {/* últimas manos */}
        <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e', marginTop: 4 }}>Últimas manos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.length === 0 && <div style={{ fontSize: 12, color: 'rgba(232,226,212,.4)' }}>Aún no hay manos jugadas.</div>}
          {history.slice(0, 3).map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 13px', borderRadius: 11, background: h.youWon ? 'rgba(47,160,106,.06)' : 'rgba(255,255,255,.025)', border: `1px solid ${h.youWon ? 'rgba(47,160,106,.2)' : 'rgba(255,255,255,.06)'}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'rgba(232,226,212,.82)' }}>Mano #{h.n} · {h.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,226,212,.45)', marginTop: 2 }}>{h.sub}</div>
              </div>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: h.delta > 0 ? '#5fc795' : 'rgba(232,226,212,.5)', flexShrink: 0 }}>{h.delta > 0 ? '+' : ''}{h.delta.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* próximamente */}
        <div style={{ fontSize: 11, color: 'rgba(232,226,212,.4)', marginTop: 2 }}>Muy pronto podrás cambiarte a mesas con rivales de todo el mundo:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {FUTURE_TABLES.map((t) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', opacity: 0.65 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 20, background: 'rgba(255,255,255,.04)' }}>{t.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: 'rgba(236,230,214,.85)' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,226,212,.4)' }}>{t.sub}</div>
              </div>
              <span style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#bfa164', border: '1px solid rgba(201,163,91,.3)', borderRadius: 999, padding: '4px 9px' }}>Pronto</span>
            </div>
          ))}
        </div>

        {/* salir */}
        <button onClick={() => { close(); levantarse(); }} style={{ marginTop: 6, padding: '15px', borderRadius: 13, border: '1px solid rgba(177,73,99,.4)', background: 'rgba(177,73,99,.12)', color: '#f0c7d0', cursor: 'pointer', fontSize: 15, fontWeight: 600, letterSpacing: '.02em' }}>
          Salir de la mesa
        </button>
        <button onClick={close} style={{ padding: '11px', borderRadius: 11, border: '1px solid rgba(255,255,255,.1)', background: 'none', color: 'rgba(232,226,212,.55)', cursor: 'pointer', fontSize: 13 }}>
          Volver al juego
        </button>
      </>
    );
  }

  // Panel de perfil + historial (compartido)
  function renderPanel() {
    return (
      <>
        <div style={playerPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 22, color: '#5fc795', background: 'radial-gradient(circle at 35% 30%,#2b2c34,#121317)', boxShadow: 'inset 0 0 0 1.5px #2fa06a', overflow: 'hidden' }}>{profile?.avatar_code ? <img src={avatarSrc(profile.avatar_code)} alt="" style={seatFaceImg} /> : (profile?.alias ?? 'T').charAt(0)}</div>
            <div>
              <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>{profile?.alias ?? 'Tú'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 13, height: 16, borderRadius: '2px 2px 6px 6px', background: 'linear-gradient(160deg,#2fa06a,#16613f)' }} />
                <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'rgba(232,226,212,.55)' }}>Caballero · {houseName}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 14 }}>
            <Stat label="Aurelios" value={you.stack.toLocaleString()} gold />
            <Divider />
            <Stat label="Influencia" value={(profile?.influence ?? 0).toLocaleString()} />
            <Divider />
            <Stat label="Manos" value={`${historyWinRate(history)}%`} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 12 }}>Chat de la mesa</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', paddingRight: 2 }}>
            {chat.map((m) => (
              <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                {!m.mine && <div style={{ fontSize: 9.5, color: '#9c7a3e', margin: '0 0 1px 2px' }}>{m.who}</div>}
                <div style={{ padding: '7px 11px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.35, color: m.mine ? '#16241c' : '#e8e2d0', background: m.mine ? 'linear-gradient(135deg,#9ff0bf,#4fbf83)' : 'rgba(255,255,255,.05)', border: m.mine ? 'none' : '1px solid rgba(255,255,255,.07)' }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder="Escribe a la mesa…"
              style={{ flex: 1, minWidth: 0, padding: '9px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: '#ece6d6', fontSize: 13, outline: 'none', fontFamily: "'Hanken Grotesk',sans-serif" }}
            />
            <button onClick={sendChat} disabled={!chatInput.trim()} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#16241c', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', opacity: chatInput.trim() ? 1 : 0.5 }}>Enviar</button>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // MÓVIL VERTICAL: pedir rotación
  // ============================================================
  if (isMobile && isPortrait) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 40%,rgba(47,160,106,.12),transparent 60%),linear-gradient(180deg,#0d0e12,#0a0a0d)', padding: 32, textAlign: 'center', gap: 28 }}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ animation: 'domRotateHint 2.8s ease-in-out infinite', transformOrigin: '50% 50%' }}>
          <rect x="16" y="10" width="30" height="50" rx="5" fill="none" stroke="#2fa06a" strokeWidth="2.5" />
          <circle cx="31" cy="52" r="2.5" fill="#2fa06a" />
          <path d="M60 34 Q76 34 76 50 Q76 66 60 66" stroke="#c9a35b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <polyline points="56,60 60,66 66,62" stroke="#c9a35b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 28, color: '#ece6d6', marginBottom: 10 }}>Gira el teléfono</div>
          <div style={{ fontSize: 14, color: 'rgba(232,226,212,.55)', maxWidth: 270, lineHeight: 1.65, margin: '0 auto' }}>
            La mesa de Texas Hold'em se juega en horizontal.
          </div>
        </div>
        <button onClick={levantarse} style={{ padding: '11px 26px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(232,226,212,.5)', cursor: 'pointer', fontSize: 13 }}>
          ← Volver al casino
        </button>
      </div>
    );
  }

  // ============================================================
  // MÓVIL HORIZONTAL: izquierda = solo mesa · derecha = todo el chrome
  // ============================================================
  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden', background: 'radial-gradient(120% 90% at 40% 42%, #11201a, #0a0a0d 70%)', paddingTop: 'env(safe-area-inset-top)' }}>
        {/* ===== IZQUIERDA: SOLO la mesa ===== */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
          {/* width:100% + aspect-ratio + max-height mantiene la proporción
              de la mesa (asientos alineados) en cualquier tamaño */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1448 / 1086', maxHeight: '100%' }}>
            <PokerTableFelt src={feltPath} color={houseColor} />

            {/* cartas comunitarias */}
            <div style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 5, zIndex: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => (game.board[i] ? <CardFace key={i} c={game.board[i]} w={40} /> : <CardSlot key={i} w={40} />))}
            </div>

            {/* bote */}
            <div style={{ position: 'absolute', left: `${POT_X}%`, top: `${POT_Y}%`, transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 2 }}>
              <div style={{ fontSize: 7.5, letterSpacing: '.34em', textTransform: 'uppercase', color: 'rgba(232,226,212,.65)', marginBottom: 3 }}>Bote</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ChipStack amount={game.pot} size={20} />
                <span style={{ fontFamily: 'Marcellus,serif', fontSize: 19, color: '#ecd9a5', textShadow: '0 0 14px rgba(201,163,91,.5)' }}>{game.pot.toLocaleString()}</span>
              </div>
            </div>

            {/* fichas apostadas */}
            {game.players.map((p, idx) => p.bet > 0 && (
              <div key={`lbet-${p.id}`} className="poker-bet-chips" style={{ position: 'absolute', left: `${POS[idx].bx}%`, top: `${POS[idx].by}%`, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 3 }}>
                <ChipStack amount={p.bet} size={15} />
                <span style={{ fontWeight: 600, fontSize: 9.5, color: '#ecd9a5', textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>{p.bet.toLocaleString()}</span>
              </div>
            ))}

            {/* fichas volando al ganador */}
            {fly && <FlyChips key={fly.key} toX={fly.x} toY={fly.y} fromX={fly.fromX} fromY={fly.fromY} amount={fly.amount} />}

            {/* mazo del crupier + cartas volando (reparto / descarte) */}
            {renderTableExtras(14, 20)}

            {/* asientos rivales (1..8) */}
            {game.players.map((p, idx) => {
              if (idx === 0) return null;
              const pos = POS[idx];
              const showCards = debugReveal ? p.hole.length > 0 : (reveal && !p.folded);
              const handLabel = showCards && game.board.length >= 3 && p.hole.length === 2
                ? HAND_NAME(handCategory(evaluate7([...p.hole, ...game.board]))) : null;
              const acting = game.toAct === idx && !game.handOver;
              const isWin = idx === winnerIdx;
              return (
                <div key={p.id} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)', width: 78, textAlign: 'center', opacity: p.folded ? 0.4 : 1, zIndex: 4 }}>
                  {p.hole.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: -7, marginBottom: -6, position: 'relative', zIndex: 1 }}>
                      {showCards
                        ? p.hole.map((c, i) => <span key={i} style={holeCardStyle}><CardFace c={c} w={22} tilt={i === 0 ? -8 : 8} /></span>)
                        : p.hole.map((_, i) => <span key={i} style={holeCardStyle}><CardBack w={18} tilt={i === 0 ? -8 : 8} /></span>)}
                    </div>
                  )}
                  {handLabel && (
                    <div style={{ fontSize: 8, letterSpacing: '.04em', color: p.folded ? 'rgba(232,160,160,.7)' : 'rgba(236,210,142,.9)', marginBottom: 1 }}>
                      {p.folded ? 'folded: ' : ''}{handLabel}
                    </div>
                  )}
                  <div style={{ position: 'relative', width: 40, height: 40, margin: '0 auto', zIndex: 2 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontFamily: 'Marcellus,serif', fontSize: 16, color: RINGS[idx],
                      background: 'radial-gradient(circle at 35% 30%,#2b2c34,#121317)',
                      boxShadow: `inset 0 0 0 1.5px ${RINGS[idx]}`,
                      ...(acting ? { animation: 'domSeatPulse 2.2s ease-in-out infinite' } : {}),
                      ...(isWin ? { animation: 'domWinGlow 1s ease-in-out infinite' } : {}),
                    }}>{p.avatar ? <img src={avatarSrc(p.avatar)} alt="" style={seatFaceImg} /> : p.name.charAt(0)}</div>
                    {idx === game.dealer && <span style={{ ...dealerBtn, width: 16, height: 16, fontSize: 8.5 }}>D</span>}
                    {acting && <TimerRing />}
                  </div>
                  <div style={{ marginTop: 3, padding: '3px 6px', borderRadius: 9, background: 'rgba(8,8,10,.72)', border: `1px solid ${isWin ? 'rgba(236,210,142,.55)' : 'rgba(255,255,255,.08)'}`, backdropFilter: 'blur(3px)', display: 'inline-block' }}>
                    <div style={{ fontSize: 10, color: 'rgba(232,226,212,.85)' }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 1 }}>
                      <Chip kind="gold" size={8} />
                      <span style={{ fontSize: 9, color: '#bfa164' }}>{p.stack.toLocaleString()}</span>
                    </div>
                  </div>
                  {p.lastAction && <div style={{ marginTop: 2, fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: p.folded ? 'rgba(232,226,212,.3)' : '#7fb89a' }}>{p.lastAction}</div>}
                </div>
              );
            })}

            {/* héroe: solo cartas, abajo-centro (sin círculo) + botón dealer */}
            <div style={{ position: 'absolute', left: `${POS[0].x}%`, top: `${POS[0].y}%`, transform: 'translate(-50%,-50%)', zIndex: 5, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                {you.hole.map((c, i) => <span key={i} style={holeCardStyle}><CardFace c={c} w={48} tilt={i === 0 ? -5 : 5} /></span>)}
              </div>
              {game.dealer === 0 && <span style={{ ...dealerBtn, position: 'static', display: 'inline-grid', marginTop: 4, width: 16, height: 16, fontSize: 8.5 }}>D</span>}
            </div>
          </div>
        </div>

        {/* ===== DERECHA: chrome (salir/menú/fichas) + apuesta + acciones ===== */}
        <div style={{ width: 'clamp(186px, 33%, 274px)', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,.06)', background: 'rgba(8,8,10,.55)', display: 'flex', flexDirection: 'column', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', paddingRight: 'calc(12px + env(safe-area-inset-right))', gap: 9 }}>
          {/* fila superior: salir + menú */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={levantarse} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 10px', borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)', color: '#ece6d6', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <span style={{ fontSize: 16, lineHeight: 0 }}>‹</span> Salir
            </button>
            {profile?.is_admin && (
              <button onClick={() => setDebugReveal((v) => !v)} title="Pruebas: ver cartas de todos" style={{ flexShrink: 0, padding: '9px 11px', borderRadius: 11, border: `1px solid ${debugReveal ? 'rgba(236,210,142,.6)' : 'rgba(255,255,255,.14)'}`, background: debugReveal ? 'rgba(236,210,142,.14)' : 'rgba(255,255,255,.03)', color: debugReveal ? '#ecd9a5' : 'rgba(232,226,212,.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                👁 {debugReveal ? 'Cartas abiertas' : 'Cartas ocultas'}
              </button>
            )}
            <button onClick={() => setDrawer(true)} aria-label="Menú de mesa" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, border: '1px solid rgba(201,163,91,.45)', background: 'rgba(201,163,91,.08)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <span style={{ display: 'block', width: 15, height: 1.6, background: '#ecd9a5', borderRadius: 2, boxShadow: '0 5px 0 #ecd9a5, 0 -5px 0 #ecd9a5' }} />
            </button>
          </div>

          {/* fichas (stock) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', borderRadius: 11, background: 'rgba(201,163,91,.1)', border: '1px solid rgba(201,163,91,.28)', flexShrink: 0 }}>
            <Chip kind="gold" size={18} />
            <span style={{ fontWeight: 700, fontSize: 17, color: '#ecd9a5' }}>{you.stack.toLocaleString()}</span>
          </div>

          {/* zona central: temporizador + sizing (o estado) */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            {dealing ? (
              <div style={{ textAlign: 'center', color: 'rgba(232,226,212,.55)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif", fontSize: 16, letterSpacing: '.04em' }}>
                Repartiendo…
              </div>
            ) : game.handOver ? (
              <div style={{ textAlign: 'center', color: '#ecd9a5', fontFamily: "'Cormorant Garamond',serif", fontSize: 17, lineHeight: 1.3 }}>
                {game.winners.some((w) => w.id === 'you')
                  ? `Te llevas el bote +⟡${game.winners.find((w) => w.id === 'you')!.amount.toLocaleString()}`
                  : `Ganó ${game.players[winnerIdx]?.name ?? '—'}`}
                <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(232,226,212,.45)', marginTop: 8 }}>
                  {you.stack > 0 ? 'Repartiendo siguiente mano…' : 'Sin fichas para continuar'}
                </div>
              </div>
            ) : yourTurn && la ? (
              <>
                <div style={{ position: 'relative', width: 60, height: 60, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <TimerRing />
                  <span style={{ fontFamily: 'Marcellus,serif', fontSize: turnLeft != null ? 22 : 11, color: turnLeft != null && turnLeft <= 5 ? '#e0894f' : '#5fc795', letterSpacing: '.05em' }}>
                    {turnLeft != null ? turnLeft : 'JUEGAS'}
                  </span>
                </div>
                {youHandLabel && <div style={{ fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#7fb89a' }}>{youHandLabel}</div>}
                {la.canRaise && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
                    <input type="range" min={minR} max={maxR} step={activeSB} value={rAmt}
                      onChange={(e) => setRaiseAmt(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#c9a35b' }} />
                    <div style={{ display: 'flex', gap: 5, width: '100%' }}>
                      <button onClick={() => setPreset(0.5)} style={{ ...sizeBtn, flex: 1, padding: '7px 2px' }}>½</button>
                      <button onClick={() => setPreset(1)} style={{ ...sizeBtn, flex: 1, padding: '7px 2px' }}>Bote</button>
                      <button onClick={() => setRaiseAmt(maxR)} style={{ ...sizeBtn, flex: 1, padding: '7px 2px', color: '#ecd9a5', border: '1px solid rgba(201,163,91,.35)' }}>Todo</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(232,226,212,.5)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif", fontSize: 15 }}>
                {game.players[game.toAct].name} está pensando…
              </div>
            )}
          </div>

          {/* acciones (siempre visibles abajo; ocultas durante el reparto) */}
          {!dealing && !game.handOver && yourTurn && la ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
              {la.canRaise && (
                <button onClick={() => setGame(applyAction(game!, { type: 'raise', to: rAmt }))} style={{ ...actRaise, padding: '14px 8px' }}>
                  {rAmt >= maxR ? `All-in · ${rAmt.toLocaleString()}` : `Subir a ${rAmt.toLocaleString()}`}
                </button>
              )}
              {la.canCheck
                ? <button onClick={() => setGame(applyAction(game!, { type: 'check' }))} style={{ ...actCall, padding: '14px 8px' }}>Pasar</button>
                : <button onClick={() => setGame(applyAction(game!, { type: 'call' }))} style={{ ...actCall, padding: '14px 8px' }}>Igualar · {la.callAmount.toLocaleString()}</button>}
              <button onClick={() => setGame(applyAction(game!, { type: 'fold' }))} style={{ ...actFold, padding: '13px 8px' }}>Retirarse</button>
            </div>
          ) : game.handOver && you.stack <= 0 ? (
            <button className="btn" onClick={levantarse} style={{ flexShrink: 0 }}>Salir</button>
          ) : null}
        </div>

        {/* menú de mesa: panel lateral derecho (la mesa sigue visible) */}
        {drawer && (
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.18)' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 'clamp(252px, 48%, 348px)', height: '100%', background: 'linear-gradient(180deg,#13141d,#0b0b10)', borderLeft: '1px solid rgba(201,163,91,.22)', padding: '14px 16px calc(16px + env(safe-area-inset-bottom))', paddingRight: 'calc(16px + env(safe-area-inset-right))', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto', boxShadow: '-30px 0 60px -20px rgba(0,0,0,.8)', animation: 'domDrawerRight .26s cubic-bezier(.3,1,.4,1) both' }}>
              {renderTableMenu(() => setDrawer(false))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={frame}>
      {/* ===== Barra superior ===== */}
      <div style={topBar}>
        <button onClick={levantarse} style={ghostBtn}>
          <span style={circleBtn}>‹</span>
          <span style={{ fontSize: 12.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(232,226,212,.5)' }}>Salir de la mesa</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={houseBadge}>{houseName.charAt(0)}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: '.32em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Salón · {houseName}</div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>Mesa de {houseName}</div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,226,212,.45)', borderLeft: '1px solid rgba(255,255,255,.1)', paddingLeft: 13 }}>Ciegas {activeSB} / {activeBB}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={chipPill}>
            <Chip kind="gold" size={18} />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#ecd9a5' }}>{you.stack.toLocaleString()}</span>
          </div>
          <button onClick={() => setRailOpen((v) => !v)} title={railOpen ? 'Ocultar panel' : 'Mostrar panel'}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: railOpen ? 'rgba(255,255,255,.04)' : 'rgba(201,163,91,.1)', color: 'rgba(232,226,212,.7)', cursor: 'pointer', fontSize: 12 }}>
            {railOpen ? 'Ocultar panel' : 'Mostrar panel'}
          </button>
        </div>
      </div>

      {/* ===== Cuerpo: mesa + panel ===== */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* --- ESCENARIO --- */}
        <div style={stage}>
          {/* mesa (imagen real) + acento de Casa */}
          <PokerTableFelt src={feltPath} color={houseColor} />

          {/* cartas comunitarias */}
          <div style={{ position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
            {[0, 1, 2, 3, 4].map((i) => (game.board[i] ? <CardFace key={i} c={game.board[i]} w={44} /> : <CardSlot key={i} w={44} />))}
          </div>

          {/* bote */}
          <div style={{ position: 'absolute', left: `${POT_X}%`, top: `${POT_Y}%`, transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 2 }}>
            <div style={{ fontSize: 8.5, letterSpacing: '.38em', textTransform: 'uppercase', color: 'rgba(232,226,212,.65)', marginBottom: 5 }}>Bote</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <ChipStack amount={game.pot} size={26} />
              <span style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#ecd9a5', textShadow: '0 0 18px rgba(201,163,91,.5)' }}>{game.pot.toLocaleString()}</span>
            </div>
          </div>

          {/* fichas apostadas en la ronda actual */}
          {game.players.map((p, idx) => p.bet > 0 && (
            <div key={`bet-${p.id}`} className="poker-bet-chips" style={{ position: 'absolute', left: `${POS[idx].bx}%`, top: `${POS[idx].by}%`, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 3 }}>
              <ChipStack amount={p.bet} size={20} />
              <span style={{ fontWeight: 600, fontSize: 11, color: '#ecd9a5', textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>{p.bet.toLocaleString()}</span>
            </div>
          ))}

          {/* fichas volando al ganador */}
          {fly && <FlyChips key={fly.key} toX={fly.x} toY={fly.y} fromX={fly.fromX} fromY={fly.fromY} amount={fly.amount} />}

          {/* mazo del crupier + cartas volando (reparto / descarte) */}
          {renderTableExtras(17, 30)}

          {/* asientos */}
          {game.players.map((p, idx) => {
            const pos = POS[idx];
            const showCards = p.id === 'you' || (reveal && !p.folded);
            const acting = game.toAct === idx && !game.handOver;
            const isWinner = idx === winnerIdx;
            const me = p.id === 'you';
            return (
              <div key={p.id} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)', width: 100, textAlign: 'center', opacity: p.folded ? 0.4 : 1, zIndex: 4 }}>
                {/* cartas */}
                {p.hole.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: me ? 6 : -10, marginBottom: -8, position: 'relative', zIndex: 1, ...holeCardStyle }}>
                    {showCards
                      ? p.hole.map((c, i) => <CardFace key={i} c={c} w={me ? 46 : 30} tilt={me ? (i === 0 ? -5 : 5) : (i === 0 ? -8 : 8)} />)
                      : p.hole.map((_, i) => <CardBack key={i} tilt={i === 0 ? -8 : 8} />)}
                  </div>
                )}
                {/* avatar */}
                <div style={{ position: 'relative', width: 52, height: 52, margin: '0 auto', zIndex: 2 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontFamily: 'Marcellus,serif', fontSize: 20, color: RINGS[idx],
                    background: 'radial-gradient(circle at 35% 30%,#2b2c34,#121317)',
                    boxShadow: `inset 0 0 0 1.5px ${RINGS[idx]}`,
                    ...(acting ? { animation: 'domSeatPulse 2.2s ease-in-out infinite' } : {}),
                    ...(isWinner ? { animation: 'domWinGlow 1s ease-in-out infinite' } : {}),
                  }}>{p.avatar ? <img src={avatarSrc(p.avatar)} alt="" style={seatFaceImg} /> : p.name.charAt(0)}</div>
                  {idx === game.dealer && <span style={dealerBtn}>D</span>}
                  {acting && <TimerRing />}
                </div>
                {/* placa */}
                <div style={{ marginTop: 6, padding: '5px 8px 6px', borderRadius: 11, background: 'rgba(8,8,10,.62)', border: `1px solid ${isWinner ? 'rgba(236,210,142,.55)' : 'rgba(255,255,255,.08)'}`, backdropFilter: 'blur(3px)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: me ? '#ece6d6' : 'rgba(232,226,212,.85)' }}>{p.name}{me && <span style={{ color: 'rgba(232,226,212,.4)' }}> · tú</span>}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 }}>
                    <Chip kind="gold" size={11} />
                    <span style={{ fontSize: 11, color: '#bfa164' }}>{p.stack.toLocaleString()}</span>
                  </div>
                </div>
                {p.lastAction && !me && <div style={{ marginTop: 4, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: p.folded ? 'rgba(232,226,212,.32)' : '#7fb89a' }}>{p.lastAction}</div>}
                {me && (
                  <div style={{ marginTop: 4, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: yourTurn && turnLeft != null && turnLeft <= 5 ? '#e0894f' : '#5fc795' }}>
                    {yourTurn ? (turnLeft != null ? `Tu turno · ${turnLeft}s` : 'Tu turno') : youHandLabel ?? '—'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- PANEL DERECHO (ocultable) --- */}
        {railOpen && <div style={rail}>{renderPanel()}</div>}
      </div>

      {/* ===== Controles ===== */}
      <div style={controls}>{renderControls()}</div>
      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,226,212,.32)', margin: '14px 0 0' }}>
        Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
      </p>
    </div>
  );
}

// ============================================================
// Lobby de póker: casinos por Casa -> mesas (con stakes y ocupación)
// ============================================================
interface PokerLobbyProps {
  houses: House[];
  wallet: number | null;
  lobbyHouse: House | null;
  setLobbyHouse: (h: House | null) => void;
  busy: boolean;
  error: string | null;
  onSit: (t: PokerTable, h: House) => void;
  onExit: () => void;
}

function PokerLobby({ houses, wallet, lobbyHouse, setLobbyHouse, busy, error, onSit, onExit }: PokerLobbyProps) {
  const lobbyBg = 'radial-gradient(120% 80% at 50% 12%, rgba(47,160,106,.10), transparent 60%), linear-gradient(180deg,#0d0e12,#0a0a0d)';
  const shortName = (h: House) => h.name.replace(/^Casa /, '');

  // La ciudad ya se eligió en el onboarding: entras directo al salón de TU
  // ciudad. Mientras carga, mostramos un estado breve.
  if (!lobbyHouse) {
    return (
      <div style={{ minHeight: '100svh', padding: '28px 18px 48px', background: lobbyBg, display: 'grid', placeItems: 'center' }}>
        <p className="muted">Abriendo el salón de póker…</p>
      </div>
    );
  }

  // --- Vista 2: mesas del casino elegido ---
  const c = lobbyHouse.color_primary ?? '#c9a35b';
  const name = shortName(lobbyHouse);
  const tables = tablesForHouse(lobbyHouse.code);
  return (
    <div style={{ minHeight: '100svh', padding: '28px 18px 48px', background: lobbyBg }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onExit} style={lobbyBack}>← Volver al Casino</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, flex: '0 0 auto', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 24, color: '#fff', background: `linear-gradient(160deg, ${c}, ${c}99)`, boxShadow: `0 0 18px -2px ${c}` }}>{name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '.3em', textTransform: 'uppercase', color: c }}>Salón de póker</div>
            <h1 className="page-title" style={{ margin: '2px 0 0' }}>Casino {name}</h1>
            <div style={{ fontSize: 12.5, color: 'rgba(232,226,212,.5)' }}>{lobbyHouse.city} · Billetera ⟡ {wallet?.toLocaleString() ?? '—'}</div>
          </div>
        </div>

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {tables.map((t) => {
            const seated = seatedCount(t.id, t.tier.maxSeats);
            const playable = t.game.playable;
            const tooPoor = playable && (wallet ?? 0) < t.tier.buyin;
            const disabled = !playable || busy || tooPoor;
            return (
              <div key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
                  background: playable ? `linear-gradient(160deg, ${c}14, rgba(255,255,255,.012))` : 'rgba(255,255,255,.02)',
                  border: `1px solid ${playable ? `${c}4d` : 'rgba(255,255,255,.07)'}`,
                  opacity: playable ? 1 : 0.62,
                }}>
                {/* tipo de juego */}
                <div style={{ flex: '0 0 auto', width: 48, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 15, color: playable ? c : 'rgba(232,226,212,.55)', border: `1px solid ${playable ? `${c}66` : 'rgba(255,255,255,.12)'}`, borderRadius: 8, padding: '4px 0' }}>{t.game.label}</div>
                </div>
                {/* detalles */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#ece6d6' }}>
                    {t.game.name} · {t.tier.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 3, fontSize: 12, color: 'rgba(232,226,212,.62)' }}>
                    <span>Ciegas <b style={{ color: '#ecd9a5', fontWeight: 600 }}>{t.tier.sb}/{t.tier.bb}</b></span>
                    <span>Buy-in <b style={{ color: '#ecd9a5', fontWeight: 600 }}>⟡{t.tier.buyin.toLocaleString()}</b></span>
                    <span>Asientos <b style={{ color: '#ecd9a5', fontWeight: 600 }}>{seated}/{t.tier.maxSeats}</b></span>
                  </div>
                  {playable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <div style={{ display: 'flex' }}>
                        {tableRoster(t.id, Math.min(5, seated)).map((cz, i) => (
                          <div
                            key={cz.name}
                            title={cz.name}
                            style={{
                              width: 22, height: 22, borderRadius: '50%', marginLeft: i === 0 ? 0 : -7,
                              display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
                              fontFamily: 'Marcellus,serif', color: '#15131c',
                              background: `linear-gradient(160deg, ${cz.color}, ${cz.color}aa)`,
                              border: '1.5px solid #15131c', zIndex: 5 - i,
                            }}
                          >
                            {cz.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(232,226,212,.5)' }}>
                        {seated > 5 ? `+${seated - 5} jugando` : 'en la mesa'}
                      </span>
                    </div>
                  )}
                  {tooPoor && <div style={{ fontSize: 11, color: '#e0937f', marginTop: 3 }}>Saldo insuficiente para esta mesa</div>}
                </div>
                {/* acción */}
                <div style={{ flex: '0 0 auto' }}>
                  {playable ? (
                    <button onClick={() => onSit(t, lobbyHouse)} disabled={disabled}
                      style={{
                        padding: '10px 18px', borderRadius: 11, border: 'none', cursor: disabled ? 'default' : 'pointer',
                        fontWeight: 700, fontSize: 13.5, color: '#2c2415',
                        background: disabled ? 'rgba(201,163,91,.35)' : 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)',
                        opacity: disabled && !busy ? 0.55 : 1,
                        boxShadow: disabled ? 'none' : '0 12px 26px -12px rgba(201,163,91,.6)',
                      }}>
                      {busy ? '…' : 'Sentarse'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#bfa164', border: '1px solid rgba(201,163,91,.3)', borderRadius: 999, padding: '6px 11px', whiteSpace: 'nowrap' }}>Próximamente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,226,212,.32)', margin: '22px 0 0' }}>
          Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
        </p>
      </div>
    </div>
  );
}

const lobbyBack: React.CSSProperties = { background: 'none', border: 'none', color: 'rgba(232,226,212,.55)', cursor: 'pointer', fontSize: 13, padding: 0 };

// ============================================================
// Subcomponentes
// ============================================================
function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: gold ? '#ecd9a5' : '#ece6d6' }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(232,226,212,.4)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Divider() { return <div style={{ width: 1, background: 'rgba(255,255,255,.07)' }} />; }

function historyWinRate(h: HistItem[]): number {
  if (h.length === 0) return 0;
  return Math.round((h.filter((x) => x.youWon).length / h.length) * 100);
}

// ---- Ficha de póker (CSS) ----
const CHIP: Record<string, { body: string; edge: string; hi: string; text: string }> = {
  ink: { body: '#1c1c22', edge: '#3a3a44', hi: '#2e2e38', text: '#ecd9a5' },
  emerald: { body: '#16613f', edge: '#2fa06a', hi: '#1f7d52', text: '#eafff4' },
  burgundy: { body: '#7b1e2b', edge: '#c45464', hi: '#a8323f', text: '#fbe9ec' },
  ivory: { body: '#e6dcc4', edge: '#c9a35b', hi: '#f6efdc', text: '#6b5527' },
  gold: { body: '#c9a35b', edge: '#ecd28e', hi: '#f4e0a0', text: '#3a2c12' },
};
function Chip({ kind, size = 24, val }: { kind: keyof typeof CHIP | string; size?: number; val?: string }) {
  const c = CHIP[kind] ?? CHIP.gold;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flex: '0 0 auto', background: c.body, border: `${Math.max(2, size * 0.13)}px dashed ${c.edge}`, boxShadow: '0 2px 6px rgba(0,0,0,.55), inset 0 0 0 1px rgba(0,0,0,.35)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '60%', height: '60%', borderRadius: '50%', background: `radial-gradient(circle at 40% 32%, ${c.hi}, ${c.body})`, display: 'grid', placeItems: 'center' }}>
        {val && <span style={{ fontSize: size * 0.26, fontWeight: 800, color: c.text, fontFamily: "'Hanken Grotesk',sans-serif" }}>{val}</span>}
      </div>
    </div>
  );
}
const DENOMS: { v: number; kind: string }[] = [
  { v: 5000, kind: 'ink' }, { v: 1000, kind: 'emerald' }, { v: 500, kind: 'burgundy' }, { v: 100, kind: 'ivory' },
];
function ChipStack({ amount, size = 24 }: { amount: number; size?: number }) {
  const kinds = DENOMS.filter((d) => amount >= d.v).map((d) => d.kind);
  if (kinds.length === 0) kinds.push('ivory');
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {kinds.map((k, i) => (
        <div key={i} style={{ marginRight: i < kinds.length - 1 ? -size * 0.46 : 0 }}><Chip kind={k} size={size} /></div>
      ))}
    </div>
  );
}

function FlyChips({ toX, toY, fromX, fromY, amount }: { toX: number; toY: number; fromX: number; fromY: number; amount: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div style={{
      position: 'absolute', left: `${go ? toX : fromX}%`, top: `${go ? toY : fromY}%`,
      transform: 'translate(-50%,-50%)', zIndex: 6, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'left .9s cubic-bezier(.5,0,.25,1), top .9s cubic-bezier(.5,0,.25,1)',
      opacity: go ? 0.9 : 1,
    }}>
      <ChipStack amount={amount} size={24} />
      <span style={{ fontWeight: 700, fontSize: 13, color: '#ecd9a5', textShadow: '0 0 12px rgba(201,163,91,.6)' }}>+{amount.toLocaleString()}</span>
    </div>
  );
}

// Paño de la mesa por Casa + acento de color sutil.
//  - <img> con src por Casa y respaldo (onError) al paño por defecto.
//  - Detrás del paño, un resplandor radial muy tenue con el color de la Casa
//    (vignette): da identidad sin teñir el fieltro ni perjudicar la lectura
//    de cartas/fichas. Si no hay color, no se dibuja el acento.
function PokerTableFelt({ src, color }: { src: string; color?: string }) {
  return (
    <>
      {color && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: `radial-gradient(120% 86% at 50% 49%, ${color}26, transparent 62%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      <img src={src} onError={feltOnError} alt="" style={{ ...tableImg, zIndex: 1 }} draggable={false} />
    </>
  );
}

// Mazo del crupier: una pila sutil de 3 dorsos apilados arriba-centro.
function DealerDeck({ size = 16 }: { size?: number }) {
  const h = Math.round((size * 42) / 30);
  return (
    <div style={{ position: 'absolute', left: `${DEALER_X}%`, top: `${DEALER_Y}%`, transform: 'translate(-50%,-50%)', zIndex: 1, pointerEvents: 'none', width: size + 6, height: h + 6 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', left: i * 1.6, top: -i * 1.6, opacity: 0.9 }}>
          <CardBack w={size} />
        </div>
      ))}
    </div>
  );
}

// Carta volando (reparto o descarte). Usa transiciones de left/top en % para
// que la trayectoria sea exacta a cualquier tamaño de pantalla (como FlyChips).
function FlyCard({ c, w, fade }: { c: FlyingCard; w: number; fade?: boolean }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  const easing = 'cubic-bezier(.4,0,.2,1)';
  return (
    <div
      style={{
        position: 'absolute',
        left: `${go ? c.toX : c.fromX}%`,
        top: `${go ? c.toY : c.fromY}%`,
        transform: 'translate(-50%,-50%)',
        zIndex: 7, pointerEvents: 'none',
        transition: `left ${c.flight}ms ${easing} ${c.delay}ms, top ${c.flight}ms ${easing} ${c.delay}ms, opacity ${c.flight}ms ease ${c.delay}ms`,
        opacity: fade ? (go ? 0 : 0.95) : 1,
      }}
    >
      {c.flip && c.face
        ? <FlipCard c={c.face} w={w} reverse={!!c.flipReverse} flipped={go} delayMs={c.delay + Math.max(0, c.flight - 140)} />
        : (c.face ? <CardFace c={c.face} w={w} /> : <CardBack w={Math.round(w * 0.86)} />)}
    </div>
  );
}

// Carta con dos caras para un volteo rotateY real. flipped controla la rotación.
//  - reparto (reverse=false): dorso (0deg) -> cara (180deg)
//  - descarte (reverse=true): cara (0deg) -> dorso (180deg)
function FlipCard({ c, w, reverse, flipped, delayMs }: { c: Card; w: number; reverse: boolean; flipped: boolean; delayMs: number }) {
  const h = Math.round((w * 76) / 54);
  const faceA = reverse
    ? <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'grid', placeItems: 'center' }}><CardFace c={c} w={w} /></div>
    : <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'grid', placeItems: 'center' }}><CardBack w={Math.round(w * 0.86)} /></div>;
  const faceB = reverse
    ? <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'grid', placeItems: 'center' }}><CardBack w={Math.round(w * 0.86)} /></div>
    : <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'grid', placeItems: 'center' }}><CardFace c={c} w={w} /></div>;
  return (
    <div style={{
      position: 'relative', width: w, height: h, transformStyle: 'preserve-3d',
      transition: `transform 380ms ease ${delayMs}ms`,
      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    }}>
      {faceA}
      {faceB}
    </div>
  );
}

function TimerRing() {
  return (
    <svg width={62} height={62} viewBox="0 0 92 92" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) rotate(-90deg)', pointerEvents: 'none' }}>
      <circle cx="46" cy="46" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
      <circle cx="46" cy="46" r="42" fill="none" stroke="#ecd9a5" strokeWidth="3" strokeLinecap="round" strokeDasharray="264" style={{ animation: `domTimer ${TURN_SECONDS}s linear forwards` }} />
    </svg>
  );
}

// ---- Carta estilo DOMANI (crema, borde dorado, pips) ----
function CardFace({ c, w = 48, tilt = 0 }: { c: Card; w?: number; tilt?: number }) {
  const h = Math.round((w * 76) / 54);
  const col = isRed(c.s) ? '#a8243c' : '#1c1c22';
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.16, position: 'relative', background: 'linear-gradient(160deg,#f7f0dd,#ece2c9)', boxShadow: '0 10px 20px -7px rgba(0,0,0,.7), inset 0 0 0 1.5px rgba(201,163,91,.55)', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, flex: '0 0 auto', transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      <div style={{ position: 'absolute', top: w * 0.07, left: w * 0.12, lineHeight: 0.9, textAlign: 'center', color: col }}>
        <div style={{ fontSize: w * 0.3 }}>{RANK_LABEL[c.r]}</div><div style={{ fontSize: w * 0.2 }}>{c.s}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: w * 0.48, color: col }}>{c.s}</div>
    </div>
  );
}
function CardSlot({ w = 48 }: { w?: number }) {
  return <div style={{ width: w, height: Math.round((w * 76) / 54), borderRadius: w * 0.16, background: 'rgba(255,255,255,.05)', border: '1px dashed rgba(201,163,91,.25)', flex: '0 0 auto' }} />;
}
function CardBack({ tilt = 0, w = 30 }: { tilt?: number; w?: number }) {
  const h = Math.round((w * 42) / 30);
  const medal = w * 0.6;
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.2, position: 'relative', background: 'linear-gradient(155deg,#3a1d2a,#1c0f16 68%,#130910)', boxShadow: '0 5px 11px -3px rgba(0,0,0,.75), inset 0 0 0 1px rgba(201,163,91,.45)', display: 'grid', placeItems: 'center', flex: '0 0 auto', transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      <div style={{ position: 'absolute', inset: w * 0.083, borderRadius: w * 0.13, border: '1px solid rgba(201,163,91,.22)' }} />
      <div style={{ width: medal, height: medal, borderRadius: '50%', padding: 1.5, boxSizing: 'border-box', background: 'conic-gradient(from 140deg,#6f5226,#f4e0a0 68deg,#c9a35b 140deg,#8c6a32 208deg,#f7e7ad 290deg,#7a5a26)', boxShadow: '0 0 7px rgba(201,163,91,.35)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 36% 30%,#e06074,#961c2e 58%,#460c1a)', fontFamily: 'Marcellus,serif', fontSize: medal * 0.47, color: '#f1d896' }}>D</div>
      </div>
    </div>
  );
}

// ============================================================
// Estilos
// ============================================================
const frame: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,#0d0e12,#0a0a0d)', boxShadow: '0 60px 120px -30px rgba(0,0,0,.85), 0 0 0 1px rgba(201,163,91,.10)' };
const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'linear-gradient(180deg,rgba(20,16,12,.6),transparent)', flexWrap: 'wrap' };
const ghostBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' };
const circleBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', color: 'rgba(232,226,212,.7)', fontSize: 19 };
const houseBadge: React.CSSProperties = { width: 22, height: 28, borderRadius: '4px 4px 11px 11px', background: 'linear-gradient(160deg,#2fa06a,#16613f)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 12, color: '#eafff4' };
const chipPill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(201,163,91,.10)', border: '1px solid rgba(201,163,91,.28)' };
const stage: React.CSSProperties = { position: 'relative', flex: '1 1 560px', minWidth: 320, aspectRatio: '1448 / 1086', alignSelf: 'center' };
const tableImg: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' };
const rail: React.CSSProperties = { flex: '1 1 290px', minWidth: 260, borderLeft: '1px solid rgba(255,255,255,.05)', background: 'linear-gradient(180deg,rgba(255,255,255,.018),transparent)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 };
const seatFaceImg: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' };
const playerPanel: React.CSSProperties = { padding: 18, borderRadius: 16, background: 'linear-gradient(160deg,rgba(201,163,91,.07),rgba(255,255,255,.012))', border: '1px solid rgba(201,163,91,.18)' };
const controls: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 26px 22px', borderTop: '1px solid rgba(255,255,255,.05)', background: 'linear-gradient(0deg,rgba(20,16,12,.5),transparent)', minHeight: 90, justifyContent: 'center', alignItems: 'center' };
const sizeBtn: React.CSSProperties = { fontSize: 11, letterSpacing: '.06em', color: 'rgba(232,226,212,.55)', padding: '7px 13px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' };
const dealerBtn: React.CSSProperties = { position: 'absolute', right: -6, bottom: -4, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#ecd28e,#c9a35b)', color: '#2c2415', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', zIndex: 3 };
const actBase: React.CSSProperties = { flex: 1, textAlign: 'center', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 500, fontSize: 14, letterSpacing: '.04em', padding: 16, borderRadius: 13, cursor: 'pointer' };
const actFold: React.CSSProperties = { ...actBase, color: 'rgba(232,226,212,.62)', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(177,73,99,.3)' };
const actCall: React.CSSProperties = { ...actBase, color: '#d8b96b', background: 'rgba(201,163,91,.08)', border: '1px solid rgba(201,163,91,.4)' };
const actRaise: React.CSSProperties = { ...actBase, flex: 1.3, fontWeight: 600, color: '#2c2415', background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)', border: 'none', boxShadow: '0 14px 30px -10px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.45)' };
