import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess, type Move, type Square } from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, pokerBuyin, pokerCashout, listHouses } from '../lib/api';
import { bestMove } from '../lib/chessBot';

const GOLD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');
const FILES = 'abcdefgh';
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

type ThemeId = 'madera' | 'ebano' | 'oro';
const THEMES: Record<ThemeId, { name: string; light: string; dark: string }> = {
  madera: { name: 'Madera', light: '#e9c9a1', dark: '#9d6a3c' },
  ebano: { name: 'Ébano', light: '#c6c8d1', dark: '#33333f' },
  oro: { name: 'Oro', light: '#f1dca6', dark: '#8a6a2e' },
};

type Stake = { id: string; name: string; bet: number; depth: number; opp: { name: string; title: string; casa: string; elo: number; glyph: string } };
const STAKES: Stake[] = [
  { id: 'aprendiz', name: 'Aprendiz', bet: 100, depth: 2, opp: { name: 'Dunia', title: 'Centinela', casa: 'Bacatá', elo: 1180, glyph: '♟' } },
  { id: 'retador', name: 'Retador', bet: 1000, depth: 3, opp: { name: 'Severo', title: 'Estratega', casa: 'Roma', elo: 1480, glyph: '♞' } },
  { id: 'maestro', name: 'Maestro', bet: 10000, depth: 3, opp: { name: 'Kenji', title: 'Gran Maestro', casa: 'Osaka', elo: 1820, glyph: '♛' } },
];

function useIsMobile(): boolean {
  const q = '(max-width: 820px)';
  const [v, setV] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(q);
    const on = () => setV(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return v;
}

type Outcome = 'win' | 'loss' | 'draw';

export function AjedrezScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  const [balance, setBalance] = useState<number | null>(null);
  const [houseName, setHouseName] = useState('Sin Casa');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameRef = useRef(new Chess());
  const workerRef = useRef<Worker | null>(null);
  const [, setVer] = useState(0);
  const bump = () => setVer((v) => v + 1);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../lib/chessBot.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerRef.current = null;
    }
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  const [stake, setStake] = useState<Stake>(STAKES[0]);
  const [theme, setTheme] = useState<ThemeId>('madera');
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTo, setLegalTo] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('Tu turno');
  const [result, setResult] = useState<{ outcome: Outcome; delta: number } | null>(null);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => {
      const h = hs.find((x) => x.id === profile?.house_id);
      if (h) setHouseName(h.name.replace(/^Casa /, ''));
    });
  }, [user, profile?.house_id]);

  const alias = profile?.alias ?? 'Tú';
  const myElo = 1000 + Math.min(900, profile?.influence ?? 0);

  async function sentarse(s: Stake) {
    if (busy) return;
    if ((balance ?? 0) < s.bet) { setError('Saldo insuficiente para esta apuesta.'); return; }
    setBusy(true);
    setError(null);
    try {
      const bal = await pokerBuyin(s.bet);
      setBalance(bal);
      gameRef.current = new Chess();
      setStake(s);
      setSelected(null);
      setLegalTo([]);
      setLastMove(null);
      setResult(null);
      setStatus('Tu turno');
      setThinking(false);
      setPhase('playing');
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sentar.');
    } finally {
      setBusy(false);
    }
  }

  function settle(outcome: Outcome, s: Stake) {
    const payout = outcome === 'win' ? s.bet * 2 : outcome === 'draw' ? s.bet : 0;
    if (payout > 0) pokerCashout(payout).then((b) => setBalance(b)).catch(() => {});
    const delta = outcome === 'win' ? s.bet : outcome === 'loss' ? -s.bet : 0;
    setResult({ outcome, delta });
    refreshProfile?.();
  }

  function finish() {
    const g = gameRef.current;
    let outcome: Outcome;
    if (g.isCheckmate()) outcome = g.turn() === 'w' ? 'loss' : 'win';
    else outcome = 'draw';
    settle(outcome, stake);
  }

  function botPlay() {
    const g = gameRef.current;
    setThinking(true);
    setStatus('Pensando…');
    const fen = g.fen();
    const started = Date.now();
    const apply = (bm: { from: string; to: string; promotion?: string } | null) => {
      const wait = Math.max(0, 380 - (Date.now() - started)); // mínimo "pensar"
      window.setTimeout(() => {
        if (bm) { try { g.move(bm); setLastMove({ from: bm.from, to: bm.to }); } catch { /* ignore */ } }
        setThinking(false);
        bump();
        if (g.isGameOver()) finish();
        else setStatus('Tu turno');
      }, wait);
    };
    const w = workerRef.current;
    if (w) {
      const onMsg = (e: MessageEvent) => { w.removeEventListener('message', onMsg); apply(e.data); };
      w.addEventListener('message', onMsg);
      w.postMessage({ fen, depth: stake.depth });
    } else {
      const bm = bestMove(fen, stake.depth);
      apply(bm ? { from: bm.from, to: bm.to, promotion: bm.promotion } : null);
    }
  }

  function onSquare(sq: Square) {
    if (thinking || result) return;
    const g = gameRef.current;
    if (g.turn() !== 'w') return; // solo mueves en tu turno (blancas)

    if (selected) {
      if (sq === selected) { setSelected(null); setLegalTo([]); return; }
      const mv = legalTo.find((t) => t.to === sq);
      if (mv) {
        try {
          g.move({ from: selected, to: sq, promotion: mv.promotion ? 'q' : undefined });
        } catch {
          return;
        }
        setSelected(null);
        setLegalTo([]);
        setLastMove({ from: selected, to: sq });
        bump();
        if (g.isGameOver()) { finish(); return; }
        botPlay();
        return;
      }
    }
    const piece = g.get(sq);
    if (piece && piece.color === 'w') {
      setSelected(sq);
      setLegalTo(g.moves({ square: sq, verbose: true }) as Move[]);
    } else {
      setSelected(null);
      setLegalTo([]);
    }
  }

  function rendirse() {
    if (result) return;
    settle('loss', stake);
  }

  function ofrecerTablas() {
    if (result) return;
    const g = gameRef.current;
    let mat = 0;
    for (const row of g.board()) for (const s2 of row) if (s2) mat += ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[s2.type] * (s2.color === 'w' ? 1 : -1);
    if (mat >= -1.2) settle('draw', stake); // el rival acepta si no va ganando claro
    else setStatus('El rival rechaza las tablas.');
  }

  function volverSalon() {
    gameRef.current = new Chess();
    setResult(null);
    setSelected(null);
    setLegalTo([]);
    setLastMove(null);
    setPhase('lobby');
    bump();
  }

  // ---------- LOBBY ----------
  if (phase === 'lobby') {
    return (
      <div style={lobbyWrap}>
        <button onClick={() => navigate('/')} style={exitBtn}>← Salir</button>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={eyebrow}>El Salón · Juegos de destreza</div>
          <h1 style={lobbyTitle}>Salón de Ajedrez</h1>
          <p style={{ color: 'rgba(232,226,212,.6)', fontStyle: 'italic', margin: '4px 0 0' }}>Un movimiento. Una consecuencia.</p>
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(232,226,212,.55)' }}>
            {houseName} · Billetera <span style={{ color: '#ecd9a5', fontWeight: 700 }}>⟡ {balance != null ? fmt(balance) : '—'}</span>
          </div>
        </div>

        {error && <p style={{ color: '#ff9a9a', textAlign: 'center', marginTop: 14 }}>{error}</p>}

        <div style={stakeList}>
          {STAKES.map((s) => {
            const tooPoor = (balance ?? 0) < s.bet;
            return (
              <div key={s.id} style={stakeRow}>
                <div style={{ ...oppGlyph }}>{s.opp.glyph}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 17, color: '#f3eddd' }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(232,226,212,.6)' }}>
                    vs <b style={{ color: '#ecd9a5' }}>{s.opp.name}</b> · {s.opp.title} · Casa {s.opp.casa} · ELO {s.opp.elo}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,226,212,.5)', marginTop: 2 }}>
                    Apuesta <b style={{ color: '#ecd9a5' }}>⟡ {fmt(s.bet)}</b> · el ganador se lleva el bote
                  </div>
                </div>
                <button onClick={() => sentarse(s)} disabled={busy || tooPoor} style={{ ...sitBtn, opacity: busy || tooPoor ? 0.5 : 1 }}>
                  {tooPoor ? 'Sin saldo' : 'Jugar'}
                </button>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,226,212,.32)', marginTop: 22 }}>
          Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
        </p>
      </div>
    );
  }

  // ---------- TABLERO ----------
  const g = gameRef.current;
  const board = g.board();
  const targets = new Set(legalTo.map((t) => t.to));
  const inCheck = g.isCheck();
  const turn = g.turn();
  let checkSq: string | null = null;
  if (inCheck) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn) checkSq = FILES[c] + (8 - r);
    }
  }
  // material capturado
  const hist = g.history({ verbose: true }) as Move[];
  const capByWhite: string[] = [];
  const capByBlack: string[] = [];
  for (const m of hist) if (m.captured) (m.color === 'w' ? capByWhite : capByBlack).push(m.captured);

  const th = THEMES[theme];
  const boardSize = isMobile ? 'min(94vw, 56vh)' : 'min(64vh, 520px)';

  return (
    <div style={boardWrap}>
      <button onClick={() => navigate('/')} style={{ ...exitBtn, position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12 }}>← Salir</button>

      {/* Rival */}
      <PlayerBar name={stake.opp.name} sub={`${stake.opp.title} · Casa ${stake.opp.casa}`} elo={stake.opp.elo} caps={capByBlack} capColor="w" you={false} active={turn === 'b'} thinking={thinking} />

      {/* Tablero */}
      <div style={{ width: boardSize, maxWidth: '100%', aspectRatio: '1', position: 'relative' }}>
        <div style={boardGrid}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const sq = (FILES[c] + (8 - r)) as Square;
              const light = (r + c) % 2 === 0;
              const isSel = selected === sq;
              const isTarget = targets.has(sq);
              const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isCheck = checkSq === sq;
              return (
                <div
                  key={sq}
                  onClick={() => onSquare(sq)}
                  style={{
                    position: 'relative', background: light ? th.light : th.dark,
                    display: 'grid', placeItems: 'center', cursor: turn === 'w' && !result ? 'pointer' : 'default',
                    boxShadow: isSel ? 'inset 0 0 0 3px #ecd28e' : isCheck ? 'inset 0 0 0 3px #e0594f' : 'none',
                  }}
                >
                  {isLast && <div style={lastDot} />}
                  {cell && (
                    <span style={{
                      fontSize: `calc(${boardSize} / 11)`, lineHeight: 1, position: 'relative', zIndex: 2,
                      color: cell.color === 'w' ? '#f8f1e4' : '#15151b',
                      textShadow: cell.color === 'w' ? '0 1px 2px rgba(0,0,0,.55), 0 0 1px rgba(0,0,0,.8)' : '0 1px 2px rgba(255,255,255,.22)',
                    }}>{GLYPH[cell.type]}</span>
                  )}
                  {isTarget && <div style={cell ? targetRing : targetDot} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tú */}
      <PlayerBar name={alias} sub={`${houseName !== 'Sin Casa' ? 'Casa ' + houseName : 'Sin Casa'} · tú`} elo={myElo} caps={capByWhite} capColor="b" you active={turn === 'w'} thinking={false} />

      {/* Estado + bote */}
      <div style={statusRow}>
        <span style={statusPill}>{result ? '—' : thinking ? 'Pensando…' : status}</span>
        <span style={{ fontSize: 13, color: 'rgba(232,226,212,.7)' }}>
          Bote <b style={{ color: '#ecd9a5' }}>⟡ {fmt(stake.bet * 2)}</b>
        </span>
      </div>

      {/* Controles */}
      <div style={controlsRow}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(THEMES) as ThemeId[]).map((t) => (
            <button key={t} onClick={() => setTheme(t)} style={{ ...themeBtn, ...(theme === t ? themeBtnActive : null) }}>{THEMES[t].name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={ofrecerTablas} disabled={!!result} style={ghostBtn}>Tablas</button>
          <button onClick={rendirse} disabled={!!result} style={dangerBtn}>Rendirse</button>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div style={overlay}>
          <div style={overlayCard}>
            <div style={{ fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', color: '#9c7a3e' }}>
              {result.outcome === 'win' ? 'Jaque mate a tu favor' : result.outcome === 'loss' ? 'Caíste' : 'Tablas'}
            </div>
            <h2 style={{ fontFamily: 'Marcellus,serif', fontSize: 30, color: '#f3eddd', margin: '8px 0 2px' }}>
              {result.outcome === 'win' ? '¡Ganaste!' : result.outcome === 'loss' ? 'Derrota' : 'Empate'}
            </h2>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 30, color: result.delta >= 0 ? '#7ee0a6' : '#ff8a8a' }}>
              {result.delta > 0 ? '+' : ''}{fmt(result.delta)} ⟡
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={volverSalon} style={sitBtn}>Volver al Salón</button>
              <button onClick={() => navigate('/')} style={ghostBtn}>Al Escritorio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerBar({ name, sub, elo, caps, capColor, you, active, thinking }: {
  name: string; sub: string; elo: number; caps: string[]; capColor: 'w' | 'b'; you: boolean; active: boolean; thinking: boolean;
}) {
  return (
    <div style={{ ...playerBar, borderColor: active ? 'rgba(201,163,91,.6)' : 'rgba(255,255,255,.08)' }}>
      <div style={{ ...avatar, background: you ? 'linear-gradient(135deg,#1f6f4a,#2da06b)' : 'linear-gradient(135deg,#7b1e2b,#c45464)' }}>
        {name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#f3eddd' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#9c7a3e' }}>ELO {elo}</span>
          {active && <span style={turnDot} />}
          {thinking && <span style={{ fontSize: 11, color: '#7ee0a6' }}>pensando…</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.55)' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 1, fontSize: 16, color: capColor === 'w' ? '#f8f1e4' : '#15151b', textShadow: capColor === 'w' ? '0 1px 2px #000' : '0 1px 2px rgba(255,255,255,.3)' }}>
        {caps.slice(0, 8).map((p, i) => <span key={i}>{GLYPH[p]}</span>)}
      </div>
    </div>
  );
}

// ---- estilos ----
const lobbyWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, overflowY: 'auto', padding: '16px 16px calc(env(safe-area-inset-bottom) + 24px)',
  background: 'radial-gradient(120% 80% at 50% 0%, #1a1626, #0a0a0d 70%)',
  paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
};
const boardWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  padding: 'calc(env(safe-area-inset-top) + 50px) 12px calc(env(safe-area-inset-bottom) + 12px)',
  background: 'radial-gradient(120% 80% at 50% 0%, #1a1626, #0a0a0d 70%)', overflowY: 'auto',
};
const exitBtn: React.CSSProperties = {
  background: 'rgba(8,8,10,.5)', border: '1px solid rgba(201,163,91,.4)', color: '#d8b96b',
  fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', zIndex: 5,
};
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', color: '#9c7a3e' };
const lobbyTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 34, color: '#ece6d6', margin: '6px 0 0' };
const stakeList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' };
const stakeRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
  border: '1px solid rgba(201,163,91,.3)', background: 'linear-gradient(160deg, rgba(201,163,91,.08), rgba(255,255,255,.012))',
};
const oppGlyph: React.CSSProperties = {
  flex: '0 0 auto', width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center',
  fontSize: 26, color: '#ecd9a5', background: 'rgba(8,8,10,.4)', border: '1px solid rgba(201,163,91,.3)',
};
const sitBtn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14,
  color: '#2c2415', background: GOLD, flex: '0 0 auto',
};
const boardGrid: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
  borderRadius: 8, overflow: 'hidden', border: '4px solid #241606', boxShadow: '0 20px 50px -20px rgba(0,0,0,.9)',
};
const lastDot: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(236,210,142,.28)', zIndex: 1 };
const targetDot: React.CSSProperties = { position: 'absolute', width: '28%', height: '28%', borderRadius: '50%', background: 'rgba(20,20,20,.35)', zIndex: 1 };
const targetRing: React.CSSProperties = { position: 'absolute', inset: '6%', borderRadius: '50%', border: '3px solid rgba(20,20,20,.4)', zIndex: 1 };
const playerBar: React.CSSProperties = {
  width: 'min(94vw, 520px)', maxWidth: '100%', display: 'flex', alignItems: 'center', gap: 12,
  padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,8,10,.4)',
};
const avatar: React.CSSProperties = {
  flex: '0 0 auto', width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center',
  fontFamily: 'Marcellus,serif', fontSize: 17, color: '#fff', fontWeight: 700,
};
const turnDot: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#7ee0a6', boxShadow: '0 0 8px #7ee0a6' };
const statusRow: React.CSSProperties = { width: 'min(94vw, 520px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const statusPill: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#ecd9a5', padding: '6px 14px', borderRadius: 999,
  border: '1px solid rgba(201,163,91,.35)', background: 'rgba(201,163,91,.1)',
};
const controlsRow: React.CSSProperties = { width: 'min(94vw, 520px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' };
const themeBtn: React.CSSProperties = {
  padding: '7px 11px', borderRadius: 9, fontSize: 12, cursor: 'pointer',
  border: '1px solid rgba(201,163,91,.3)', background: 'transparent', color: 'rgba(232,226,212,.7)',
};
const themeBtnActive: React.CSSProperties = { background: GOLD, color: '#2c2415', border: 'none', fontWeight: 700 };
const ghostBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
  border: '1px solid rgba(201,163,91,.4)', background: 'transparent', color: '#d8b96b',
};
const dangerBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
  border: '1px solid rgba(255,138,138,.45)', background: 'rgba(255,138,138,.1)', color: '#ffb3b3',
};
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: 20,
  background: 'rgba(6,5,9,.78)', backdropFilter: 'blur(4px)',
};
const overlayCard: React.CSSProperties = {
  textAlign: 'center', padding: '28px 26px', borderRadius: 20, width: 'min(360px, 100%)',
  border: '1px solid rgba(201,163,91,.35)', background: 'linear-gradient(160deg,#181425,#100e17)',
  boxShadow: '0 30px 70px -30px rgba(0,0,0,.9)',
};
