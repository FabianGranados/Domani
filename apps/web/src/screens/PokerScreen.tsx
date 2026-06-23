import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, pokerBuyin, pokerCashout } from '../lib/api';
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
// posiciones de los 6 asientos (idx 0 = humano, abajo centro)
const POS = [
  { x: '50%', y: '92%' },
  { x: '13%', y: '74%' },
  { x: '6%', y: '34%' },
  { x: '50%', y: '7%' },
  { x: '94%', y: '34%' },
  { x: '87%', y: '74%' },
];
const RINGS = ['#ecd9a5', ...BOTS.map((b) => b.ring)];

export function PokerScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  const [buyin, setBuyin] = useState(DEFAULT_BUYIN);
  const [wallet, setWallet] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [dealer, setDealer] = useState(0);
  const cashedRef = useRef(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setWallet(w?.balance ?? 0));
  }, [user]);

  async function sentarse() {
    setBusy(true);
    setError(null);
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
    } finally {
      setBusy(false);
    }
  }

  async function levantarse() {
    if (cashedRef.current) { navigate('/casino'); return; }
    cashedRef.current = true;
    const youStack = game?.players.find((p) => p.id === 'you')?.stack ?? 0;
    try {
      await pokerCashout(youStack);
      await refreshProfile();
    } catch { /* noop */ }
    navigate('/casino');
  }

  function nextHand() {
    if (!game) return;
    const nd = (dealer + 1) % game.players.length;
    setDealer(nd);
    // conservar stacks; jugadores sin fichas quedan fuera (startHand los marca folded)
    setGame(startHand(game.players, nd, SB, BB));
  }

  // turno de los bots (auto)
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
          <button className="btn" onClick={sentarse} disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Sentándote…' : 'Sentarse a la mesa'}
          </button>
          <button onClick={() => navigate('/casino')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'rgba(232,226,212,.5)', cursor: 'pointer' }}>← Volver al Casino</button>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(232,226,212,.4)', marginTop: 14 }}>
          Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
        </p>
      </div>
    );
  }

  if (!game) return null;
  const you = game.players.find((p) => p.id === 'you')!;
  const reveal = game.phase === 'showdown' || game.phase === 'done';
  const yourTurn = !game.handOver && game.players[game.toAct].id === 'you';
  const la = yourTurn ? legalActions(game) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem' }}>Texas Hold’em</h1>
        <button onClick={levantarse} style={{ color: '#d8b96b', fontSize: 14, border: '1px solid rgba(201,163,91,.45)', padding: '9px 16px', borderRadius: 11, background: 'rgba(8,8,10,.4)', cursor: 'pointer' }}>
          Levantarse (cobrar ⟡{you.stack})
        </button>
      </div>

      <div style={tableArea}>
        <div style={feltOval}>
          <div style={feltInner}>
            <div style={{ fontFamily: 'Marcellus,serif', letterSpacing: '.4em', fontSize: 'clamp(16px,2.4vw,26px)', color: 'rgba(201,163,91,.2)', paddingLeft: '.4em' }}>DOMANI</div>
            <div style={{ marginTop: 8, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(232,226,212,.6)' }}>
              Bote <span style={{ color: '#ecd9a5', fontWeight: 700 }}>⟡ {game.pot}</span>
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (game.board[i] ? <CardFace key={i} c={game.board[i]} /> : <CardSlot key={i} />))}
            </div>
          </div>
        </div>

        {game.players.map((p, idx) => {
          const pos = POS[idx];
          const showCards = p.id === 'you' || (reveal && !p.folded);
          return (
            <div key={p.id} style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)', opacity: p.folded ? 0.4 : 1, zIndex: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {p.hole.length > 0 && (showCards
                    ? p.hole.map((c, i) => <CardFace key={i} c={c} small />)
                    : p.hole.map((_, i) => <CardBack key={i} />))}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ ...avatar, boxShadow: `0 0 0 2px ${RINGS[idx]}, 0 8px 18px -8px rgba(0,0,0,.8)`, outline: game.toAct === idx && !game.handOver ? '2px solid #ecd28e' : 'none', outlineOffset: 2 }}>
                    {p.name.charAt(0)}
                  </div>
                  {idx === game.dealer && <span style={dealerBtn}>D</span>}
                </div>
                <div style={{ background: 'rgba(8,8,10,.8)', border: '1px solid rgba(201,163,91,.25)', borderRadius: 9, padding: '4px 9px', textAlign: 'center', minWidth: 78 }}>
                  <div style={{ fontSize: 11.5, color: '#f3eddd', fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: '#ecd9a5' }}>⟡ {p.stack}</div>
                  {p.lastAction && <div style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(232,226,212,.55)' }}>{p.lastAction}</div>}
                </div>
                {p.bet > 0 && <span style={betChip}>⟡ {p.bet}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div style={{ marginTop: 18, minHeight: 56 }}>
        {game.handOver ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ecd9a5', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 10 }}>
              {game.winners.some((w) => w.id === 'you') ? `¡Ganaste ⟡${game.winners.find((w) => w.id === 'you')!.amount}!` : `Mano terminada.`}
            </div>
            {you.stack > 0 ? (
              <button className="btn" style={{ maxWidth: 260, margin: '0 auto' }} onClick={nextHand}>Siguiente mano</button>
            ) : (
              <button className="btn" style={{ maxWidth: 260, margin: '0 auto' }} onClick={levantarse}>Sin fichas — salir</button>
            )}
          </div>
        ) : yourTurn && la ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={actGhost} onClick={() => setGame(applyAction(game, { type: 'fold' }))}>Retirarse</button>
            {la.canCheck ? (
              <button style={actGhost} onClick={() => setGame(applyAction(game, { type: 'check' }))}>Pasar</button>
            ) : (
              <button style={actGhost} onClick={() => setGame(applyAction(game, { type: 'call' }))}>Igualar ⟡{la.callAmount}</button>
            )}
            {la.canRaise && (
              <>
                <button style={actGold} onClick={() => raiseTo(game, setGame, 0.5)}>Subir ½ bote</button>
                <button style={actGold} onClick={() => raiseTo(game, setGame, 1)}>Subir bote</button>
                <button style={actGold} onClick={() => setGame(applyAction(game, { type: 'raise', to: la.maxRaiseTo }))}>All-in ⟡{la.maxRaiseTo}</button>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(232,226,212,.5)', fontSize: 14 }}>
            {game.players[game.toAct].name} está pensando…
          </div>
        )}
      </div>
    </div>
  );
}

function raiseTo(game: Game, setGame: (g: Game) => void, potFrac: number) {
  const la = legalActions(game);
  const sizing = (game.pot + la.callAmount) * potFrac;
  const to = Math.min(la.maxRaiseTo, Math.max(la.minRaiseTo, Math.round(game.currentBet + sizing)));
  setGame(applyAction(game, { type: 'raise', to }));
}

function CardFace({ c, small }: { c: Card; small?: boolean }) {
  const w = small ? 26 : 34, h = small ? 37 : 48;
  return (
    <div style={{ width: w, height: h, borderRadius: 5, background: '#f4f1e8', boxShadow: '0 4px 10px -4px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: isRed(c.s) ? '#b3322f' : '#1a1a1a', fontWeight: 700, fontSize: small ? 12 : 15, lineHeight: 1 }}>{RANK_LABEL[c.r]}</span>
      <span style={{ color: isRed(c.s) ? '#b3322f' : '#1a1a1a', fontSize: small ? 12 : 15, lineHeight: 1 }}>{c.s}</span>
    </div>
  );
}
function CardSlot() {
  return <div style={{ width: 34, height: 48, borderRadius: 5, background: 'rgba(255,255,255,.05)', border: '1px dashed rgba(255,255,255,.18)' }} />;
}
function CardBack() {
  return <div style={{ width: 26, height: 37, borderRadius: 4, background: 'linear-gradient(155deg,#7b1e2b,#3a0f17 70%,#240a10)', border: '1px solid rgba(201,163,91,.5)', display: 'grid', placeItems: 'center' }}><span style={{ fontFamily: 'Marcellus,serif', fontSize: 11, color: '#ecd9a5' }}>D</span></div>;
}

const tableArea: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: 880, margin: '0 auto', aspectRatio: '16 / 10' };
const feltOval: React.CSSProperties = { position: 'absolute', inset: '15% 7%', borderRadius: '50% / 50%', background: 'linear-gradient(180deg,#caa24f,#7a5e2a)', padding: 12, boxShadow: '0 30px 70px -28px rgba(0,0,0,.9), inset 0 2px 6px rgba(255,255,255,.25)' };
const feltInner: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50% / 50%', background: 'radial-gradient(78% 56% at 50% 38%, rgba(201,163,91,.14), transparent 64%), radial-gradient(120% 95% at 50% 45%, #1f6f4a, #0f3b28 68%, #0a2a1c)', boxShadow: 'inset 0 0 60px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const avatar: React.CSSProperties = { width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: 'Marcellus,serif', fontSize: 19, color: '#f3eddd', background: 'linear-gradient(160deg,#2a2536,#15131c)' };
const dealerBtn: React.CSSProperties = { position: 'absolute', bottom: -4, right: -8, width: 19, height: 19, borderRadius: '50%', background: 'linear-gradient(135deg,#ecd28e,#a8843f)', color: '#2c2415', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' };
const betChip: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: '#ecd9a5', background: 'rgba(8,8,10,.7)', border: '1px solid rgba(201,163,91,.4)', borderRadius: 999, padding: '2px 8px', marginTop: 2 };
const actGhost: React.CSSProperties = { padding: '12px 22px', borderRadius: 11, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(8,8,10,.4)', color: '#ece6d6', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const actGold: React.CSSProperties = { padding: '12px 20px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)', color: '#2c2415', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
