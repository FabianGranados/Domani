import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, listHouses, pokerBuyin, pokerCashout } from '../lib/api';
import {
  startHand, applyAction, legalActions, botAction,
  evaluate7, handCategory, HAND_NAME, RANK_LABEL, isRed,
  type Game, type Player, type Card,
} from '../lib/poker';

const SB = 100;
const BB = 200;
const DEFAULT_BUYIN = 10000;

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
  { x: 50, y: 90, bx: 50, by: 70 }, // tú
  { x: 17, y: 77, bx: 28, by: 64 }, // Dunia
  { x: 7, y: 47, bx: 18, by: 48 },  // Severo
  { x: 15, y: 15, bx: 25, by: 29 }, // Mira
  { x: 36, y: 9, bx: 41, by: 22 },  // Tobías
  { x: 64, y: 9, bx: 59, by: 22 },  // Kenji
  { x: 85, y: 15, bx: 75, by: 29 }, // Vael
  { x: 93, y: 47, bx: 82, by: 48 }, // Lucía
  { x: 83, y: 77, bx: 72, by: 64 }, // Bruno
];
const RINGS = ['#5fc795', ...BOTS.map((b) => b.ring)];
const POT_X = 50, POT_Y = 63; // centro del bote sobre el fieltro


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

export function PokerScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  const [buyin, setBuyin] = useState(DEFAULT_BUYIN);
  const [wallet, setWallet] = useState<number | null>(null);
  const [houseName, setHouseName] = useState('Bacatá');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [dealer, setDealer] = useState(0);
  const [raiseAmt, setRaiseAmt] = useState(BB * 2);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [fly, setFly] = useState<{ x: number; y: number; fromX: number; fromY: number; amount: number; key: number } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  const cashedRef = useRef(false);
  const handNoRef = useRef(1283);
  const startStackRef = useRef(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setWallet(w?.balance ?? 0));
    listHouses().then((hs) =>
      setHouseName(hs.find((h) => h.id === profile?.house_id)?.name.replace(/^Casa /, '') ?? 'Bacatá'),
    );
  }, [user, profile?.house_id]);

  async function sentarse() {
    setBusy(true); setError(null);
    try {
      const bal = await pokerBuyin(buyin);
      setWallet(bal);
      const players: Player[] = [
        { id: 'you', name: profile?.alias ?? 'Tú', isBot: false, style: 'normal', stack: buyin, bet: 0, hole: [], folded: false, allIn: false, acted: false },
        ...BOTS.map((b) => ({ id: b.name, name: b.name, isBot: true, style: b.style, stack: buyin, bet: 0, hole: [] as Card[], folded: false, allIn: false, acted: false })),
      ];
      const d = Math.floor(Math.random() * players.length);
      setDealer(d);
      startStackRef.current = buyin;
      recordedRef.current = false;
      setHistory([]);
      handNoRef.current = 1283;
      setGame(startHand(players, d, SB, BB));
      cashedRef.current = false;
      setPhase('playing');
      try { await document.documentElement.requestFullscreen?.(); } catch { /* iOS/desktop ignore */ }
      try { await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape'); } catch { /* iOS/desktop ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sentar');
    } finally { setBusy(false); }
  }

  async function levantarse() {
    if (cashedRef.current) { navigate('/casino'); return; }
    cashedRef.current = true;
    const youStack = game?.players.find((p) => p.id === 'you')?.stack ?? 0;
    try { await pokerCashout(youStack); await refreshProfile(); } catch { /* noop */ }
    try { (screen.orientation as unknown as { unlock: () => void }).unlock(); } catch { /* not supported */ }
    try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch { /* noop */ }
    navigate('/casino');
  }

  function nextHand() {
    if (!game) return;
    const alive = game.players.filter((p) => p.stack > 0).length;
    if (alive < 2) { levantarse(); return; }
    const nd = (dealer + 1) % game.players.length;
    setDealer(nd);
    startStackRef.current = game.players.find((p) => p.id === 'you')?.stack ?? 0;
    recordedRef.current = false;
    setGame(startHand(game.players, nd, SB, BB));
  }

  // Bots juegan en automático
  useEffect(() => {
    if (!game || game.handOver) return;
    const cur = game.players[game.toAct];
    if (cur.isBot && !cur.folded && !cur.allIn) {
      const t = setTimeout(() => {
        setGame((g) => (g && !g.handOver && g.players[g.toAct].isBot ? applyAction(g, botAction(g)) : g));
      }, 800 + Math.random() * 650);
      return () => clearTimeout(t);
    }
  }, [game]);

  // Fin de mano: animar fichas al ganador + registrar historial
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
      const t = setTimeout(() => setFly(null), 1300);
      return () => clearTimeout(t);
    }
    if (!game.handOver) setFly(null);
  }, [game?.handOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Lobby (buy-in) ----------
  if (phase === 'lobby') {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Casino · Mesa</div>
        <h1 className="page-title" style={{ margin: '6px 0 1rem' }}>Texas Hold’em</h1>
        <div className="panel" style={{ borderColor: 'rgba(201,163,91,.35)' }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Siéntate contra 8 jugadores de la Casa. Ciegas ⟡{SB}/⟡{BB}. Tu billetera:{' '}
            <span className="aurelios">⟡ {wallet?.toLocaleString() ?? '—'}</span>
          </p>
          <label style={{ display: 'block', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '8px 0 6px' }}>Buy-in (Aurelios)</label>
          <input type="number" min={BB * 20} step={1000} value={buyin}
            onChange={(e) => setBuyin(Math.max(BB * 20, Number(e.target.value)))}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 11, color: '#ece6d6', fontSize: 16 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[5000, 10000, 40000].map((v) => (
              <button key={v} onClick={() => setBuyin(v)} style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid rgba(201,163,91,.4)', background: buyin === v ? 'rgba(201,163,91,.2)' : 'transparent', color: '#ecd9a5', cursor: 'pointer', fontSize: 13 }}>⟡{v.toLocaleString()}</button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" onClick={sentarse} disabled={busy} style={{ marginTop: 16 }}>{busy ? 'Sentándote…' : 'Sentarse a la mesa'}</button>
          <button onClick={() => navigate('/casino')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'rgba(232,226,212,.5)', cursor: 'pointer' }}>← Volver al Casino</button>
        </div>
      </div>
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
  const minR = la ? la.minRaiseTo : BB * 2;
  const maxR = la ? la.maxRaiseTo : BB * 2;
  const rAmt = Math.min(maxR, Math.max(minR, raiseAmt));
  const setPreset = (frac: number) => setRaiseAmt(Math.min(maxR, Math.max(minR, Math.round(game.currentBet + (game.pot + (la?.callAmount ?? 0)) * frac))));

  // Controles (compartidos entre escritorio y móvil)
  function renderControls() {
    if (game!.handOver) {
      return (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ color: '#ecd9a5', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 12 }}>
            {game!.winners.some((w) => w.id === 'you')
              ? `Te llevas el bote · +⟡${game!.winners.find((w) => w.id === 'you')!.amount.toLocaleString()}`
              : `Ganó ${game!.players[winnerIdx]?.name ?? '—'}`}
          </div>
          <button className="btn" style={{ maxWidth: 280, margin: '0 auto' }} onClick={nextHand}>
            {you.stack > 0 ? 'Siguiente mano' : 'Sin fichas — salir'}
          </button>
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
              <input type="range" min={minR} max={maxR} step={SB} value={rAmt}
                onChange={(e) => setRaiseAmt(Number(e.target.value))}
                style={{ flex: 1, minWidth: 120, accentColor: '#c9a35b' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 90, justifyContent: 'flex-end' }}>
                <Chip kind="gold" size={16} />
                <span style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#ecd9a5' }}>{rAmt.toLocaleString()}</span>
              </div>
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

  // Panel de perfil + historial (compartido)
  function renderPanel() {
    return (
      <>
        <div style={playerPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 22, color: '#5fc795', background: 'radial-gradient(circle at 35% 30%,#2b2c34,#121317)', boxShadow: 'inset 0 0 0 1.5px #2fa06a' }}>{(profile?.alias ?? 'T').charAt(0)}</div>
            <div>
              <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>{profile?.alias ?? 'Tú'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 13, height: 16, borderRadius: '2px 2px 6px 6px', background: 'linear-gradient(160deg,#2fa06a,#16613f)' }} />
                <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'rgba(232,226,212,.55)' }}>Caballero · Casa {houseName}</span>
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
          <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 12 }}>Historial de manos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto' }}>
            {history.length === 0 && <div style={{ fontSize: 12, color: 'rgba(232,226,212,.4)' }}>Aún no hay manos jugadas.</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', borderRadius: 11, background: h.youWon ? 'rgba(47,160,106,.06)' : 'rgba(255,255,255,.025)', border: `1px solid ${h.youWon ? 'rgba(47,160,106,.2)' : 'rgba(255,255,255,.06)'}` }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(232,226,212,.78)' }}>Mano #{h.n} · {h.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(232,226,212,.4)', marginTop: 2 }}>{h.sub}</div>
                </div>
                <span style={{ fontWeight: 600, fontSize: 12, color: h.delta > 0 ? '#5fc795' : 'rgba(232,226,212,.55)' }}>{h.delta > 0 ? '+' : ''}{h.delta.toLocaleString()}</span>
              </div>
            ))}
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
  // MÓVIL HORIZONTAL: mesa a pantalla completa, panel inferior desplegable
  // ============================================================
  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(120% 80% at 50% 38%, #11201a, #0a0a0d 70%)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* ESCENARIO ocupa todo: la mesa se centra y el resto flota encima */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* caja con proporción fija para alinear asientos a la imagen */}
          <div style={{ position: 'relative', height: '100%', aspectRatio: '1040 / 640', maxWidth: '100%' }}>
            <img src="/assets/poker-table.webp" alt="" style={tableImg} draggable={false} />

            {/* cartas comunitarias */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 5, zIndex: 2 }}>
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

            {/* asientos (los 9, incluyendo tú abajo-centro) */}
            {game.players.map((p, idx) => {
              const pos = POS[idx];
              const showCards = p.id === 'you' || (reveal && !p.folded);
              const acting = game.toAct === idx && !game.handOver;
              const isWin = idx === winnerIdx;
              const me = p.id === 'you';
              return (
                <div key={p.id} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)', width: 82, textAlign: 'center', opacity: p.folded ? 0.4 : 1, zIndex: 4 }}>
                  {p.hole.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: me ? 5 : -7, marginBottom: -6, position: 'relative', zIndex: 1 }}>
                      {showCards
                        ? p.hole.map((c, i) => <CardFace key={i} c={c} w={me ? 40 : 22} tilt={me ? (i === 0 ? -5 : 5) : (i === 0 ? -8 : 8)} />)
                        : p.hole.map((_, i) => <CardBack key={i} w={18} tilt={i === 0 ? -8 : 8} />)}
                    </div>
                  )}
                  <div style={{ position: 'relative', width: me ? 46 : 40, height: me ? 46 : 40, margin: '0 auto', zIndex: 2 }}>
                    <div style={{
                      width: me ? 46 : 40, height: me ? 46 : 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontFamily: 'Marcellus,serif', fontSize: me ? 18 : 16, color: RINGS[idx],
                      background: 'radial-gradient(circle at 35% 30%,#2b2c34,#121317)',
                      boxShadow: `inset 0 0 0 1.5px ${RINGS[idx]}`,
                      ...(acting ? { animation: 'domSeatPulse 2.2s ease-in-out infinite' } : {}),
                      ...(isWin ? { animation: 'domWinGlow 1s ease-in-out infinite' } : {}),
                    }}>{p.name.charAt(0)}</div>
                    {idx === game.dealer && <span style={{ ...dealerBtn, width: 16, height: 16, fontSize: 8.5 }}>D</span>}
                    {acting && <TimerRing />}
                  </div>
                  <div style={{ marginTop: 3, padding: '3px 6px', borderRadius: 9, background: 'rgba(8,8,10,.72)', border: `1px solid ${isWin ? 'rgba(236,210,142,.55)' : me ? 'rgba(47,160,106,.4)' : 'rgba(255,255,255,.08)'}`, backdropFilter: 'blur(3px)', display: 'inline-block' }}>
                    <div style={{ fontSize: 10, color: me ? '#5fc795' : 'rgba(232,226,212,.85)' }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 1 }}>
                      <Chip kind="gold" size={8} />
                      <span style={{ fontSize: 9, color: '#bfa164' }}>{p.stack.toLocaleString()}</span>
                    </div>
                  </div>
                  {p.lastAction && !me && <div style={{ marginTop: 2, fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: p.folded ? 'rgba(232,226,212,.3)' : '#7fb89a' }}>{p.lastAction}</div>}
                  {me && <div style={{ marginTop: 2, fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5fc795' }}>{yourTurn ? 'Tu turno' : youHandLabel ?? '—'}</div>}
                </div>
              );
            })}
          </div>

          {/* barra superior flotante: salir · stock · menú */}
          <div style={{ position: 'absolute', top: 8, left: 10, right: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 6, pointerEvents: 'none' }}>
            <button onClick={levantarse} style={{ ...circleBtn, width: 30, height: 30, fontSize: 16, background: 'rgba(8,8,10,.7)', backdropFilter: 'blur(4px)', cursor: 'pointer', pointerEvents: 'auto' }}>‹</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
              <div style={{ ...chipPill, padding: '6px 13px', background: 'rgba(8,8,10,.7)', backdropFilter: 'blur(4px)' }}>
                <Chip kind="gold" size={16} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#ecd9a5' }}>{you.stack.toLocaleString()}</span>
              </div>
              <button onClick={() => setDrawer(true)} style={{ ...circleBtn, width: 30, height: 30, fontSize: 14, background: 'rgba(8,8,10,.7)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}>☰</button>
            </div>
          </div>
        </div>

        {/* controles fijos abajo (ancho completo) — se conservan tal cual */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 14px 12px', alignItems: 'center', maxWidth: 880, width: '100%', margin: '0 auto' }}>
          {renderControls()}
        </div>

        {/* panel inferior desplegable: perfil + historial */}
        {drawer && (
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '82%', background: 'linear-gradient(180deg,#13141d,#0b0b10)', borderTop: '1px solid rgba(201,163,91,.22)', borderRadius: '18px 18px 0 0', padding: '10px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', animation: 'domSheetUp .28s cubic-bezier(.3,1,.4,1) both' }}>
              <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.18)', margin: '0 auto 4px', flexShrink: 0 }} />
              {renderPanel()}
              <button onClick={() => setDrawer(false)} style={{ marginTop: 4, padding: '11px', borderRadius: 11, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)', color: 'rgba(232,226,212,.7)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>Cerrar</button>
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
            <div style={{ fontSize: 9, letterSpacing: '.32em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Salón · Casa {houseName}</div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>Mesa de {houseName}</div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,226,212,.45)', borderLeft: '1px solid rgba(255,255,255,.1)', paddingLeft: 13 }}>Ciegas {SB} / {BB}</div>
        </div>
        <div style={chipPill}>
          <Chip kind="gold" size={18} />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#ecd9a5' }}>{you.stack.toLocaleString()}</span>
        </div>
      </div>

      {/* ===== Cuerpo: mesa + panel ===== */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* --- ESCENARIO --- */}
        <div style={stage}>
          {/* mesa (imagen real) */}
          <img src="/assets/poker-table.webp" alt="" style={tableImg} draggable={false} />

          {/* cartas comunitarias */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
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
                  <div style={{ display: 'flex', justifyContent: 'center', gap: me ? 6 : -10, marginBottom: -8, position: 'relative', zIndex: 1 }}>
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
                  }}>{p.name.charAt(0)}</div>
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
                  <div style={{ marginTop: 4, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5fc795' }}>
                    {yourTurn ? 'Tu turno' : youHandLabel ?? '—'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- PANEL DERECHO --- */}
        <div style={rail}>{renderPanel()}</div>
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

function TimerRing() {
  return (
    <svg width={62} height={62} viewBox="0 0 92 92" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) rotate(-90deg)', pointerEvents: 'none' }}>
      <circle cx="46" cy="46" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
      <circle cx="46" cy="46" r="42" fill="none" stroke="#ecd9a5" strokeWidth="3" strokeLinecap="round" strokeDasharray="264" style={{ animation: 'domTimer 18s linear infinite' }} />
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
const stage: React.CSSProperties = { position: 'relative', flex: '1 1 560px', minWidth: 320, aspectRatio: '1040 / 640', alignSelf: 'center' };
const tableImg: React.CSSProperties = { position: 'absolute', left: '50%', top: '49%', transform: 'translate(-50%,-50%)', width: '84%', maxHeight: '92%', objectFit: 'contain', filter: 'drop-shadow(0 40px 70px rgba(0,0,0,.6))', userSelect: 'none', pointerEvents: 'none' };
const rail: React.CSSProperties = { flex: '1 1 290px', minWidth: 260, borderLeft: '1px solid rgba(255,255,255,.05)', background: 'linear-gradient(180deg,rgba(255,255,255,.018),transparent)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 };
const playerPanel: React.CSSProperties = { padding: 18, borderRadius: 16, background: 'linear-gradient(160deg,rgba(201,163,91,.07),rgba(255,255,255,.012))', border: '1px solid rgba(201,163,91,.18)' };
const controls: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 26px 22px', borderTop: '1px solid rgba(255,255,255,.05)', background: 'linear-gradient(0deg,rgba(20,16,12,.5),transparent)', minHeight: 90, justifyContent: 'center', alignItems: 'center' };
const sizeBtn: React.CSSProperties = { fontSize: 11, letterSpacing: '.06em', color: 'rgba(232,226,212,.55)', padding: '7px 13px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' };
const dealerBtn: React.CSSProperties = { position: 'absolute', right: -6, bottom: -4, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#ecd28e,#c9a35b)', color: '#2c2415', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', zIndex: 3 };
const actBase: React.CSSProperties = { flex: 1, textAlign: 'center', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 500, fontSize: 14, letterSpacing: '.04em', padding: 16, borderRadius: 13, cursor: 'pointer' };
const actFold: React.CSSProperties = { ...actBase, color: 'rgba(232,226,212,.62)', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(177,73,99,.3)' };
const actCall: React.CSSProperties = { ...actBase, color: '#d8b96b', background: 'rgba(201,163,91,.08)', border: '1px solid rgba(201,163,91,.4)' };
const actRaise: React.CSSProperties = { ...actBase, flex: 1.3, fontWeight: 600, color: '#2c2415', background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)', border: 'none', boxShadow: '0 14px 30px -10px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.45)' };
