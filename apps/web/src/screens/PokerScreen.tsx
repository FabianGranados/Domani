import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, listHouses, pokerBuyin, pokerCashout } from '../lib/api';
import {
  startHand, applyAction, legalActions, botAction,
  RANK_LABEL, isRed, type Game, type Player, type Card,
} from '../lib/poker';

const SB = 25;
const BB = 50;
const DEFAULT_BUYIN = 5000;

const BOTS: { name: string; ring: string; style: Player['style'] }[] = [
  { name: 'Dunia', ring: '#b9c2cc', style: 'conservador' },
  { name: 'Mira', ring: '#e8e2d0', style: 'agresivo' },
  { name: 'Tobías', ring: '#2fa06a', style: 'normal' },
  { name: 'Vael', ring: '#c8814a', style: 'agresivo' },
  { name: 'Lucía', ring: '#3f9d8a', style: 'normal' },
];
// 6 asientos alrededor del óvalo (idx 0 = humano, abajo centro)
const POS = [
  { x: '50%', y: '96%' },
  { x: '9%', y: '74%' },
  { x: '5%', y: '30%' },
  { x: '50%', y: '4%' },
  { x: '95%', y: '30%' },
  { x: '91%', y: '74%' },
];
const RINGS = ['#ecd9a5', ...BOTS.map((b) => b.ring)];

export function PokerScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  const [buyin, setBuyin] = useState(DEFAULT_BUYIN);
  const [wallet, setWallet] = useState<number | null>(null);
  const [houseName, setHouseName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [dealer, setDealer] = useState(0);
  const cashedRef = useRef(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setWallet(w?.balance ?? 0));
    listHouses().then((hs) => setHouseName(hs.find((h) => h.id === profile?.house_id)?.name.replace(/^Casa /, '') ?? 'DOMANI'));
  }, [user, profile?.house_id]);

  async function sentarse() {
    setBusy(true); setError(null);
    try {
      const bal = await pokerBuyin(buyin);
      setWallet(bal);
      const players: Player[] = [
        { id: 'you', name: profile?.alias ?? 'Tú', isBot: false, style: 'normal', stack: buyin, bet: 0, hole: [], folded: false, allIn: false, acted: false },
        ...BOTS.map((b) => ({ id: b.name, name: b.name, isBot: true, style: b.style, stack: buyin, bet: 0, hole: [], folded: false, allIn: false, acted: false })),
      ];
      const d = Math.floor(Math.random() * players.length);
      setDealer(d);
      setGame(startHand(players, d, SB, BB));
      cashedRef.current = false;
      setPhase('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sentar');
    } finally { setBusy(false); }
  }

  async function levantarse() {
    if (cashedRef.current) { navigate('/casino'); return; }
    cashedRef.current = true;
    const youStack = game?.players.find((p) => p.id === 'you')?.stack ?? 0;
    try { await pokerCashout(youStack); await refreshProfile(); } catch { /* noop */ }
    navigate('/casino');
  }

  function nextHand() {
    if (!game) return;
    const nd = (dealer + 1) % game.players.length;
    setDealer(nd);
    setGame(startHand(game.players, nd, SB, BB));
  }

  useEffect(() => {
    if (!game || game.handOver) return;
    const cur = game.players[game.toAct];
    if (cur.isBot && !cur.folded && !cur.allIn) {
      const t = setTimeout(() => {
        setGame((g) => (g && !g.handOver && g.players[g.toAct].isBot ? applyAction(g, botAction(g)) : g));
      }, 750 + Math.random() * 700);
      return () => clearTimeout(t);
    }
  }, [game]);

  // ---------- Lobby ----------
  if (phase === 'lobby') {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Casino · Mesa</div>
        <h1 className="page-title" style={{ margin: '6px 0 1rem' }}>Texas Hold’em</h1>
        <div className="panel" style={{ borderColor: 'rgba(201,163,91,.35)' }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Siéntate contra 5 jugadores. Ciegas ⟡{SB}/⟡{BB}. Tu billetera: <span className="aurelios">⟡ {wallet ?? '—'}</span>
          </p>
          <label style={{ display: 'block', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '8px 0 6px' }}>Buy-in (Aurelios)</label>
          <input type="number" min={BB * 20} step={500} value={buyin}
            onChange={(e) => setBuyin(Math.max(BB * 20, Number(e.target.value)))}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 11, color: '#ece6d6', fontSize: 16 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[2000, 5000, 20000].map((v) => (
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ===== Barra superior ===== */}
      <div style={topBar}>
        <button onClick={levantarse} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={backCircle}>‹</span>
          <span style={{ fontSize: 12.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(232,226,212,.5)' }}>Salir de la mesa</span>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '.32em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Salón · Casa {houseName}</div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>Mesa de {houseName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(232,226,212,.45)' }}>Ciegas {SB}/{BB}</span>
          <div style={chipPill}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%,#f4e0a0,#c9a35b 60%,#8c6a32)' }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#ecd9a5' }}>{you.stack.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ===== Mesa ===== */}
      <div style={tableArea}>
        <div style={feltOval}>
          <div style={feltInner}>
            <div style={{ fontFamily: 'Marcellus,serif', letterSpacing: '.42em', fontSize: 'clamp(16px,2.6vw,28px)', color: 'rgba(201,163,91,.18)', paddingLeft: '.42em' }}>DOMANI</div>
            {/* cartas comunitarias */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, minHeight: 68 }}>
              {[0, 1, 2, 3, 4].map((i) => (game.board[i] ? <CardFace key={i} c={game.board[i]} w={48} /> : <CardSlot key={i} w={48} />))}
            </div>
            {/* bote */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 8.5, letterSpacing: '.38em', textTransform: 'uppercase', color: 'rgba(232,226,212,.6)' }}>Bote</div>
              <div style={{ fontFamily: "'Hanken Grotesk'", fontWeight: 700, fontSize: 20, color: '#ecd9a5', marginTop: 3 }}>⟡ {game.pot.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {game.players.map((p, idx) => {
          const pos = POS[idx];
          const showCards = p.id === 'you' || (reveal && !p.folded);
          const acting = game.toAct === idx && !game.handOver;
          return (
            <div key={p.id} style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)', opacity: p.folded ? 0.42 : 1, zIndex: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {p.hole.length > 0 && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {showCards ? p.hole.map((c, i) => <CardFace key={i} c={c} w={32} />) : p.hole.map((_, i) => <CardBack key={i} />)}
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <div style={{ ...avatar, boxShadow: `0 0 0 2px ${RINGS[idx]}, 0 8px 18px -8px rgba(0,0,0,.8)`, outline: acting ? '2px solid #ecd28e' : 'none', outlineOffset: 3 }}>{p.name.charAt(0)}</div>
                  {idx === game.dealer && <span style={dealerBtn}>D</span>}
                </div>
                <div style={plaque}>
                  <div style={{ fontSize: 11.5, color: '#f3eddd', fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: '#ecd9a5' }}>⟡ {p.stack.toLocaleString()}</div>
                  {p.lastAction && <div style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(232,226,212,.55)' }}>{p.lastAction}</div>}
                </div>
                {p.bet > 0 && <span style={betChip}>⟡ {p.bet}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Acciones ===== */}
      <div style={{ maxWidth: 560, margin: '20px auto 0', minHeight: 60 }}>
        {game.handOver ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ecd9a5', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 10 }}>
              {game.winners.some((w) => w.id === 'you') ? `¡Ganaste ⟡${game.winners.find((w) => w.id === 'you')!.amount}!` : 'Mano terminada.'}
            </div>
            {you.stack > 0
              ? <button className="btn" style={{ maxWidth: 260, margin: '0 auto' }} onClick={nextHand}>Siguiente mano</button>
              : <button className="btn" style={{ maxWidth: 260, margin: '0 auto' }} onClick={levantarse}>Sin fichas — salir</button>}
          </div>
        ) : yourTurn && la ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <div role="button" onClick={() => setGame(applyAction(game, { type: 'fold' }))} style={actFold}>Retirarse</div>
            {la.canCheck
              ? <div role="button" onClick={() => setGame(applyAction(game, { type: 'check' }))} style={actCall}>Pasar</div>
              : <div role="button" onClick={() => setGame(applyAction(game, { type: 'call' }))} style={actCall}>Igualar · {la.callAmount}</div>}
            {la.canRaise && (
              <div role="button" onClick={() => raiseTo(game, setGame, 1)} style={actRaise}>Subir</div>
            )}
            {la.canRaise && (
              <div role="button" onClick={() => setGame(applyAction(game, { type: 'raise', to: la.maxRaiseTo }))} style={{ ...actCall, flex: 0.8 }}>All-in</div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(232,226,212,.5)', fontSize: 14 }}>{game.players[game.toAct].name} está pensando…</div>
        )}
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,226,212,.35)', marginTop: 14 }}>
        Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
      </p>
    </div>
  );
}

function raiseTo(game: Game, setGame: (g: Game) => void, potFrac: number) {
  const la = legalActions(game);
  const sizing = (game.pot + la.callAmount) * potFrac;
  const to = Math.min(la.maxRaiseTo, Math.max(la.minRaiseTo, Math.round(game.currentBet + sizing)));
  setGame(applyAction(game, { type: 'raise', to }));
}

// ---- Carta estilo DOMANI (crema, borde dorado, pips) ----
function CardFace({ c, w = 48 }: { c: Card; w?: number }) {
  const h = Math.round((w * 76) / 54);
  const col = isRed(c.s) ? '#b3322f' : '#1c1c22';
  const pip = (rot?: boolean): React.CSSProperties => ({ position: 'absolute', lineHeight: 0.9, textAlign: 'center', color: col, ...(rot ? { bottom: w * 0.07, right: w * 0.12, transform: 'rotate(180deg)' } : { top: w * 0.07, left: w * 0.12 }) });
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.16, position: 'relative', background: 'linear-gradient(160deg,#f7f0dd,#ece2c9)', boxShadow: '0 10px 20px -7px rgba(0,0,0,.7), inset 0 0 0 1.5px rgba(201,163,91,.5)', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, flex: '0 0 auto' }}>
      <div style={pip()}><div style={{ fontSize: w * 0.3 }}>{RANK_LABEL[c.r]}</div><div style={{ fontSize: w * 0.2 }}>{c.s}</div></div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: w * 0.48, color: col }}>{c.s}</div>
      <div style={pip(true)}><div style={{ fontSize: w * 0.3 }}>{RANK_LABEL[c.r]}</div><div style={{ fontSize: w * 0.2 }}>{c.s}</div></div>
    </div>
  );
}
function CardSlot({ w = 48 }: { w?: number }) {
  return <div style={{ width: w, height: Math.round((w * 76) / 54), borderRadius: w * 0.16, background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.16)', flex: '0 0 auto' }} />;
}
function CardBack() {
  return <div style={{ width: 30, height: 42, borderRadius: 5, background: 'linear-gradient(155deg,#7b1e2b,#3a0f17 70%,#240a10)', boxShadow: 'inset 0 0 0 1px rgba(201,163,91,.5)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}><span style={{ fontFamily: 'Marcellus,serif', fontSize: 13, color: '#ecd9a5' }}>D</span></div>;
}

const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(180deg,rgba(20,16,12,.6),rgba(13,14,18,.4))', border: '1px solid rgba(201,163,91,.12)', marginBottom: 14, flexWrap: 'wrap' };
const backCircle: React.CSSProperties = { width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', color: 'rgba(232,226,212,.7)', fontSize: 19 };
const chipPill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, background: 'rgba(201,163,91,.10)', border: '1px solid rgba(201,163,91,.28)' };
const tableArea: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: 880, margin: '0 auto', aspectRatio: '16 / 11' };
const feltOval: React.CSSProperties = { position: 'absolute', inset: '13% 5%', borderRadius: '50% / 50%', background: 'linear-gradient(180deg,#3a2c12,#1c1508)', padding: 'clamp(10px,2vw,18px)', boxShadow: '0 40px 90px -30px rgba(0,0,0,.9), inset 0 2px 8px rgba(201,163,91,.4), inset 0 -4px 10px rgba(0,0,0,.6)' };
const feltInner: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50% / 50%', background: 'radial-gradient(80% 58% at 50% 40%, rgba(201,163,91,.16), transparent 62%), radial-gradient(120% 100% at 50% 46%, #1f6f4a, #114a30 60%, #0a2e1d)', boxShadow: 'inset 0 0 70px rgba(0,0,0,.6), inset 0 0 0 3px rgba(201,163,91,.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const avatar: React.CSSProperties = { width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 19, color: '#f3eddd', background: 'linear-gradient(160deg,#2a2536,#15131c)' };
const dealerBtn: React.CSSProperties = { position: 'absolute', bottom: -4, right: -8, width: 19, height: 19, borderRadius: '50%', background: 'linear-gradient(135deg,#ecd28e,#a8843f)', color: '#2c2415', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' };
const plaque: React.CSSProperties = { background: 'rgba(8,8,10,.82)', border: '1px solid rgba(201,163,91,.25)', borderRadius: 10, padding: '4px 10px', textAlign: 'center', minWidth: 80 };
const betChip: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: '#ecd9a5', background: 'rgba(8,8,10,.7)', border: '1px solid rgba(201,163,91,.4)', borderRadius: 999, padding: '2px 8px', marginTop: 2 };
const actBase: React.CSSProperties = { flex: 1, textAlign: 'center', fontFamily: "'Hanken Grotesk'", fontWeight: 500, fontSize: 14, letterSpacing: '.04em', padding: 16, borderRadius: 13, cursor: 'pointer', userSelect: 'none' };
const actFold: React.CSSProperties = { ...actBase, color: 'rgba(232,226,212,.62)', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(177,73,99,.35)' };
const actCall: React.CSSProperties = { ...actBase, color: '#d8b96b', background: 'rgba(201,163,91,.08)', border: '1px solid rgba(201,163,91,.4)' };
const actRaise: React.CSSProperties = { ...actBase, flex: 1.3, fontWeight: 600, color: '#2c2415', background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)', border: 'none', boxShadow: '0 14px 30px -10px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.45)' };
