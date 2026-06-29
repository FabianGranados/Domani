import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess, type Move, type Square } from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, pokerBuyin, pokerCashout, listHouses, avatarSrc, getChessOpponent, recordChessResult } from '../lib/api';

// Mapea el id del reto (n1..n5) a la clave del retador para los trofeos.
const CHALLENGER_KEY: Record<string, string> = { n1: 'teo', n2: 'vera', n3: 'severo', n4: 'aurelio', n5: 'encapuchado' };
import type { House } from '../lib/types';
import { bestMove } from '../lib/chessBot';
import { humanChessDelayMs } from '../lib/humanTiming';
import { ChessPiece } from '../components/ChessPieces';
import { AjedrezLobby } from '../components/AjedrezLobby';

const GOLD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');
const FILES = 'abcdefgh';
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

type ThemeId = 'madera' | 'ebano' | 'oro';
// Tableros con marco (imagen completa). `inset` = grosor del marco como % para
// alinear la rejilla de piezas exactamente sobre el área de juego 8×8.
const THEMES: Record<ThemeId, { name: string; img: string; inset: number }> = {
  madera: { name: 'Madera', img: '/assets/board-madera.webp', inset: 9.5 },
  ebano: { name: 'Ébano', img: '/assets/board-ebano.webp', inset: 9.5 },
  oro: { name: 'Oro', img: '/assets/board-oro.webp', inset: 10 },
};

type Stake = { id: string; name: string; bet: number; depth: number; level: 1 | 2 | 3 | 4 | 5; opp: { name: string; title: string; casa: string; elo: number; img: string } };
// 5 niveles (examen), todos abiertos. La apuesta es la ENTRADA; el premio real
// al vencer se afina con la lógica de trofeos/escalafón (siguiente fase).
const STAKES: Stake[] = [
  { id: 'n1', name: 'Nivel 1 · Aprendiz', bet: 100, depth: 2, level: 1, opp: { name: 'Teo', title: 'Aprendiz', casa: 'Bacatá', elo: 1180, img: '/assets/maestro-1.webp' } },
  { id: 'n2', name: 'Nivel 2 · Retador', bet: 250, depth: 3, level: 2, opp: { name: 'Vera', title: 'Estratega', casa: 'Imperia', elo: 1480, img: '/assets/maestro-2.webp' } },
  { id: 'n3', name: 'Nivel 3 · Maestro', bet: 500, depth: 3, level: 3, opp: { name: 'Severo', title: 'Maestro', casa: 'Edoria', elo: 1820, img: '/assets/maestro-3.webp' } },
  { id: 'n4', name: 'Nivel 4 · Gran Maestro', bet: 1000, depth: 4, level: 4, opp: { name: 'Don Aurelio', title: 'Gran Maestro', casa: 'Severia', elo: 2200, img: '/assets/maestro-4.webp' } },
  { id: 'n5', name: 'Nivel 5 · Campeón Mundial', bet: 2000, depth: 4, level: 5, opp: { name: 'El Encapuchado', title: 'Campeón Mundial', casa: 'Severia', elo: 2600, img: '/assets/maestro-5.webp' } },
];

type TimeControl = { id: string; label: string; ms: number }; // ms = 0 => sin reloj
const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', label: 'Sin reloj', ms: 0 },
  { id: 'blitz', label: 'Blitz · 5 min', ms: 5 * 60_000 },
  { id: 'rapida', label: 'Rápida · 10 min', ms: 10 * 60_000 },
  { id: 'clasica', label: 'Clásica · 20 min', ms: 20 * 60_000 },
];

const fmtClock = (ms: number): string => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

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
  const [houseName, setHouseName] = useState('Sin ciudad');
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
  const [result, setResult] = useState<{ outcome: Outcome; delta: number; reason?: 'time' } | null>(null);

  // ---- Reloj ----
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[0]);
  const [whiteMs, setWhiteMs] = useState(0); // tú = blancas
  const [blackMs, setBlackMs] = useState(0); // rival = negras
  const lastTickRef = useRef<number | null>(null);
  const flaggedRef = useRef(false);

  const [houses, setHouses] = useState<House[]>([]);
  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => {
      setHouses(hs);
      const h = hs.find((x) => x.id === profile?.house_id);
      if (h) setHouseName(h.name.replace(/^Casa /, ''));
    });
  }, [user, profile?.house_id]);

  // Reta a un CIUDADANO al azar del ecosistema (no eliges, te toca quien ande
  // por ahí). Más Influencia → más fuerte. Apuesta baja, partida tranquila.
  async function retarCiudadano() {
    const opp = await getChessOpponent().catch(() => null);
    if (!opp) return;
    const city = houses.find((h) => h.id === opp.house_id)?.name.replace(/^Casa /, '') ?? 'Domani';
    const elo = 1000 + Math.min(1500, opp.influence ?? 0);
    const level = (elo < 1200 ? 1 : elo < 1500 ? 2 : elo < 1900 ? 3 : elo < 2300 ? 4 : 5) as 1 | 2 | 3 | 4 | 5;
    const s: Stake = {
      id: 'cit-' + opp.id, name: 'Mesa abierta', bet: 100, depth: Math.min(4, level), level,
      opp: { name: opp.alias, title: 'Ciudadano', casa: city, elo, img: avatarSrc(opp.avatar_code) },
    };
    await sentarse(s);
  }

  const alias = profile?.alias ?? 'Tú';
  const myAvatar = avatarSrc(profile?.avatar_code);
  const myElo = 1000 + Math.min(900, profile?.influence ?? 0);

  // ---- Tick del reloj (tiempo real vía Date.now) ----
  const clockOn = timeControl.ms > 0;
  const turnTick = gameRef.current.turn(); // cambia con cada jugada (vía bump) → re-arma el intervalo
  useEffect(() => {
    if (phase !== 'playing' || !clockOn || result) {
      lastTickRef.current = null;
      return;
    }
    const turnSide = gameRef.current.turn(); // 'w' = tú, 'b' = rival
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      if (flaggedRef.current) return;
      const now = Date.now();
      const prev = lastTickRef.current ?? now;
      const dt = now - prev;
      lastTickRef.current = now;
      if (turnSide === 'w') {
        setWhiteMs((ms) => {
          const next = ms - dt;
          if (next <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            window.setTimeout(() => settle('loss', stake, 'time'), 0);
            return 0;
          }
          return next;
        });
      } else {
        setBlackMs((ms) => {
          const next = ms - dt;
          if (next <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            window.setTimeout(() => settle('win', stake, 'time'), 0);
            return 0;
          }
          return next;
        });
      }
    }, 200);
    return () => window.clearInterval(id);
    // re-armar el intervalo cuando cambia el turno, la fase, el resultado o el control de tiempo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, clockOn, result, turnTick]);

  async function sentarse(s: Stake, timeMs = timeControl.ms) {
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
      flaggedRef.current = false;
      lastTickRef.current = null;
      const tc = TIME_CONTROLS.find((t) => t.ms === timeMs) ?? TIME_CONTROLS[0];
      setTimeControl(tc);
      setWhiteMs(timeMs);
      setBlackMs(timeMs);
      setPhase('playing');
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sentar.');
    } finally {
      setBusy(false);
    }
  }

  function settle(outcome: Outcome, s: Stake, reason?: 'time') {
    const payout = outcome === 'win' ? s.bet * 2 : outcome === 'draw' ? s.bet : 0;
    if (payout > 0) pokerCashout(payout).then((b) => setBalance(b)).catch(() => {});
    const delta = outcome === 'win' ? s.bet : outcome === 'loss' ? -s.bet : 0;
    setResult({ outcome, delta, reason });
    // Trofeos: solo cuenta contra los 5 retadores nombrados (no mesa abierta).
    const ck = CHALLENGER_KEY[s.id];
    if (ck) recordChessResult(ck, outcome).catch(() => {});
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
      // Ritmo HUMANO: variable según complejidad de la posición; se tanquea en
      // posiciones densas o en jaque, con límites. (No instantáneo de máquina.)
      let pieceCount = 0;
      for (const row of g.board()) for (const sq of row) if (sq) pieceCount++;
      const target = humanChessDelayMs({
        legalMoves: g.moves().length,
        inCheck: g.inCheck(),
        pieceCount,
        level: stake.level,
      });
      const wait = Math.max(0, target - (Date.now() - started));
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
      w.postMessage({ fen, level: stake.level });
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
    flaggedRef.current = false;
    lastTickRef.current = null;
    setWhiteMs(0);
    setBlackMs(0);
    setPhase('lobby');
    bump();
  }

  // ---------- LOBBY ----------
  if (phase === 'lobby') {
    return (
      <AjedrezLobby
        alias={alias}
        avatarSrc={myAvatar}
        balance={balance}
        houseName={houseName}
        onPlay={(i, ms) => sentarse(STAKES[i], ms)}
        onChallengeCitizen={retarCiudadano}
        onExit={() => navigate('/')}
      />
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
      <div style={barWithClock}>
        <PlayerBar name={stake.opp.name} sub={`${stake.opp.title} · ${stake.opp.casa}`} elo={stake.opp.elo} caps={capByBlack} capColor="w" you={false} active={turn === 'b'} thinking={thinking} img={stake.opp.img} />
        {clockOn && <Clock ms={blackMs} active={turn === 'b' && !result} />}
      </div>

      {/* Tablero con marco (imagen) + rejilla de piezas encima */}
      <div style={{
        width: boardSize, maxWidth: '100%', aspectRatio: '1', position: 'relative',
        backgroundImage: `url('${th.img}')`, backgroundSize: 'cover', backgroundPosition: 'center',
        borderRadius: 10, boxShadow: '0 24px 60px -22px rgba(0,0,0,.9)',
      }}>
        <div style={{
          position: 'absolute', top: `${th.inset}%`, left: `${th.inset}%`, right: `${th.inset}%`, bottom: `${th.inset}%`,
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
        }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const sq = (FILES[c] + (8 - r)) as Square;
              const isSel = selected === sq;
              const isTarget = targets.has(sq);
              const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isCheck = checkSq === sq;
              return (
                <div
                  key={sq}
                  onClick={() => onSquare(sq)}
                  style={{
                    position: 'relative', display: 'grid', placeItems: 'center',
                    cursor: turn === 'w' && !result ? 'pointer' : 'default',
                    boxShadow: isSel ? 'inset 0 0 0 3px #ecd28e' : isCheck ? 'inset 0 0 0 3px #e0594f' : 'none',
                  }}
                >
                  {isLast && <div style={lastDot} />}
                  {cell && (
                    <span style={{ position: 'relative', zIndex: 2, width: '84%', height: '84%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChessPiece type={cell.type} white={cell.color === 'w'} size="100%" />
                    </span>
                  )}
                  {isTarget && <div style={cell ? targetRing : targetDot} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tú */}
      <div style={barWithClock}>
        <PlayerBar name={alias} sub={`${houseName} · tú`} elo={myElo} caps={capByWhite} capColor="b" you active={turn === 'w'} thinking={false} img={myAvatar} />
        {clockOn && <Clock ms={whiteMs} active={turn === 'w' && !result} />}
      </div>

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
              {result.reason === 'time'
                ? 'Se acabó el tiempo'
                : result.outcome === 'win' ? 'Jaque mate a tu favor' : result.outcome === 'loss' ? 'Caíste' : 'Tablas'}
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

function PlayerBar({ name, sub, elo, caps, capColor, you, active, thinking, img }: {
  name: string; sub: string; elo: number; caps: string[]; capColor: 'w' | 'b'; you: boolean; active: boolean; thinking: boolean; img?: string;
}) {
  return (
    <div style={{ ...playerBar, borderColor: active ? 'rgba(201,163,91,.6)' : 'rgba(255,255,255,.08)' }}>
      <div style={{ ...avatar, overflow: 'hidden', background: you ? 'linear-gradient(135deg,#1f6f4a,#2da06b)' : 'linear-gradient(135deg,#7b1e2b,#c45464)' }}>
        {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0)}
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
      <div style={{ display: 'flex', gap: 1 }}>
        {caps.slice(0, 8).map((p, i) => <ChessPiece key={i} type={p} white={capColor === 'w'} size={16} />)}
      </div>
    </div>
  );
}

function Clock({ ms, active }: { ms: number; active: boolean }) {
  const low = ms <= 30_000; // bajo 30s → rojo
  const color = active ? (low ? '#ff7a7a' : '#ecd28e') : 'rgba(232,226,212,.55)';
  const border = active ? (low ? 'rgba(255,122,122,.7)' : 'rgba(201,163,91,.7)') : 'rgba(255,255,255,.1)';
  const bg = active ? (low ? 'rgba(255,122,122,.12)' : 'rgba(201,163,91,.14)') : 'rgba(8,8,10,.5)';
  return (
    <div
      style={{
        flex: '0 0 auto',
        fontFamily: "'Marcellus',serif",
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(16px, 4.6vw, 21px)',
        fontWeight: 700,
        letterSpacing: '.04em',
        color,
        padding: '5px 11px',
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: bg,
        minWidth: 64,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        animation: active && low ? 'domPulse 1.1s ease-in-out infinite' : undefined,
      }}
      aria-label="reloj"
    >
      {fmtClock(ms)}
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
const lastDot: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(236,210,142,.3)', zIndex: 1 };
const targetDot: React.CSSProperties = { position: 'absolute', width: '28%', height: '28%', borderRadius: '50%', background: 'rgba(20,20,20,.35)', zIndex: 1 };
const targetRing: React.CSSProperties = { position: 'absolute', inset: '6%', borderRadius: '50%', border: '3px solid rgba(20,20,20,.4)', zIndex: 1 };
const barWithClock: React.CSSProperties = {
  width: 'min(94vw, 520px)', maxWidth: '100%', display: 'flex', alignItems: 'stretch', gap: 8,
};
const tcWrap: React.CSSProperties = {
  maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', marginTop: 20, textAlign: 'center',
};
const tcRow: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
};
const tcBtn: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 600,
  border: '1px solid rgba(201,163,91,.3)', background: 'transparent', color: 'rgba(232,226,212,.72)',
};
const tcBtnActive: React.CSSProperties = { background: GOLD, color: '#2c2415', border: 'none', fontWeight: 800 };
const playerBar: React.CSSProperties = {
  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
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
  background: 'rgba(6,5,9,.78)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
};
const overlayCard: React.CSSProperties = {
  textAlign: 'center', padding: '28px 26px', borderRadius: 20, width: 'min(360px, 100%)',
  border: '1px solid rgba(201,163,91,.35)', background: 'linear-gradient(160deg,#181425,#100e17)',
  boxShadow: '0 30px 70px -30px rgba(0,0,0,.9)',
};
