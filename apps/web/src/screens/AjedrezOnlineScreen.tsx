// =============================================================================
// Ajedrez ONLINE — humano vs humano en tiempo real (Supabase Realtime).
// Emparejamiento al azar, reto por correo/alias/código, retos entrantes, y el
// tablero sincronizado entre los dos jugadores.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess, type Move } from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import {
  findUser, chessQuickMatch, chessChallenge, chessAccept, chessMove, chessResign,
  chessMyGames, subscribeMatch, subscribeChallenges, avatarSrc,
  type ChessMatch, type FoundUser, type MyGame,
} from '../lib/api';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

export function AjedrezOnlineScreen() {
  const { session } = useAuth();
  const myId = session?.user?.id ?? '';

  const [mode, setMode] = useState<'lobby' | 'searching' | 'playing'>('lobby');
  const [match, setMatch] = useState<ChessMatch | null>(null);
  const [youWhite, setYouWhite] = useState(true);
  const [oppName, setOppName] = useState<string>('Rival');
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const gameRef = useRef(new Chess());

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [challenges, setChallenges] = useState<ChessMatch[]>([]);
  const [myGames, setMyGames] = useState<MyGame[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const unsubMatchRef = useRef<(() => void) | null>(null);

  // Lobby: retos entrantes + mis partidas.
  useEffect(() => {
    if (!myId) return;
    // Al abrir: carga partidas Y retos pendientes (esperando que tú aceptes).
    chessMyGames().then((games) => {
      setMyGames(games);
      const pending = games.filter((m) => m.status === 'waiting' && !m.you_white);
      if (pending.length) setChallenges((c) => {
        const have = new Set(c.map((x) => x.id));
        return [...pending.filter((p) => !have.has(p.id)), ...c];
      });
    }).catch(() => {});
    const off = subscribeChallenges(myId, (m) => {
      setChallenges((c) => [m, ...c.filter((x) => x.id !== m.id)]);
      setNote('¡Te retaron a una partida! Acéptalo abajo.');
    });
    return off;
  }, [myId]);

  useEffect(() => () => { unsubMatchRef.current?.(); }, []);

  function watchMatch(m: ChessMatch, white: boolean, opp: string) {
    unsubMatchRef.current?.();
    setMatch(m); setYouWhite(white); setOppName(opp);
    gameRef.current = new Chess(m.fen);
    setMode(m.status === 'active' ? 'playing' : 'searching');
    unsubMatchRef.current = subscribeMatch(m.id, (nm) => {
      setMatch(nm);
      if (nm.fen !== gameRef.current.fen()) { gameRef.current = new Chess(nm.fen); }
      if (nm.status === 'active') setMode('playing');
      bump();
    });
  }

  async function quickMatch() {
    setNote(null);
    try {
      const m = await chessQuickMatch();
      const white = m.white_id === myId;
      if (m.status === 'active') watchMatch(m, white, 'Rival');
      else { watchMatch(m, white, 'Rival'); setNote('Buscando un humano disponible…'); }
    } catch { setNote('No se pudo emparejar.'); }
  }

  async function doSearch() {
    const q = query.trim(); if (!q) return;
    try { const r = await findUser(q); setResults(r); if (!r.length) setNote('No encontré a nadie con eso.'); }
    catch { setNote('Error buscando.'); }
  }

  async function challenge(u: FoundUser) {
    try {
      const m = await chessChallenge(u.id);
      setResults([]); setQuery('');
      watchMatch(m, true, u.alias);
      setNote(`Reto enviado a ${u.alias}. Esperando que acepte…`);
    } catch { setNote('No se pudo enviar el reto.'); }
  }

  async function accept(m: ChessMatch) {
    try {
      const am = await chessAccept(m.id);
      setChallenges((c) => c.filter((x) => x.id !== m.id));
      watchMatch(am, false, 'Rival');
    } catch { setNote('Ese reto ya no está disponible.'); }
  }

  async function resign() {
    if (!match) return;
    try { await chessResign(match.id); } catch { /* noop */ }
  }

  function leave() {
    unsubMatchRef.current?.(); unsubMatchRef.current = null;
    setMatch(null); setMode('lobby'); setSelected(null); setLegal([]);
    chessMyGames().then(setMyGames).catch(() => {});
  }

  // ---- Tablero ----
  const g = gameRef.current;
  const myColor = youWhite ? 'w' : 'b';
  const isMyTurn = !!match && match.status === 'active' && match.turn === myColor;
  const finished = !!match && match.status === 'finished';

  function onSquare(sq: string) {
    if (!isMyTurn || finished) return;
    if (selected) {
      const mv = legal.find((m) => m.to === sq);
      if (mv) { doMove(selected, sq); return; }
    }
    const piece = g.get(sq as never);
    if (piece && piece.color === myColor) {
      setSelected(sq);
      setLegal(g.moves({ square: sq as never, verbose: true }) as Move[]);
    } else { setSelected(null); setLegal([]); }
  }

  function doMove(from: string, to: string) {
    let move: Move | null = null;
    try { move = g.move({ from, to, promotion: 'q' }) as Move; } catch { return; }
    if (!move) return;
    setSelected(null); setLegal([]); bump();
    let fin = false, winner: string | null = null, result: string | null = null;
    if (g.isGameOver()) {
      fin = true;
      if (g.isCheckmate()) { winner = myId; result = 'checkmate'; }
      else { result = 'draw'; }
    }
    if (match) chessMove(match.id, g.fen(), g.turn(), from + to, fin, winner, result).catch(() => { bump(); });
  }

  // orden de casillas según orientación
  const board = g.board();
  const rows = youWhite ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = youWhite ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  if (mode !== 'lobby' && match) {
    const resultText = finished
      ? (match.result === 'draw' ? '½ Tablas'
        : match.winner_id === myId ? '♚ ¡Ganaste!'
        : match.result === 'resign' ? 'Tu rival se rindió… o tú' : '♚ Perdiste')
      : null;
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ color: '#ece6d6', fontSize: 18 }}>vs {oppName}</strong>
          <button onClick={leave} style={btnGhost}>Salir</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 14, color: isMyTurn ? '#7ee0a6' : 'rgba(232,226,212,.6)' }}>
          {mode === 'searching' ? 'Esperando al rival…' : finished ? resultText : isMyTurn ? 'Tu turno' : 'Turno del rival…'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', border: '2px solid #3a3327', borderRadius: 6, overflow: 'hidden', maxWidth: 440, margin: '0 auto', aspectRatio: '1', pointerEvents: mode === 'searching' ? 'none' : 'auto' }}>
          {rows.map((r) => cols.map((c) => {
            const sq = String.fromCharCode(97 + c) + (8 - r);
            const cell = board[r][c];
            const dark = (r + c) % 2 === 1;
            const isSel = selected === sq;
            const isTarget = legal.some((m) => m.to === sq);
            const isLast = match.last_move && (match.last_move.slice(0, 2) === sq || match.last_move.slice(2, 4) === sq);
            return (
              <div key={sq} onClick={() => onSquare(sq)} style={{
                aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSel ? '#b9a44e' : isLast ? (dark ? '#9d8a3f' : '#cdb96a') : dark ? '#7d6549' : '#d8c39a',
                fontSize: 'min(7vw, 30px)', cursor: isMyTurn ? 'pointer' : 'default', position: 'relative',
              }}>
                {cell && <span style={{
                  color: cell.color === 'w' ? '#f7f0dc' : '#141210',
                  // Contorno opuesto para que se distingan en cualquier casilla.
                  textShadow: cell.color === 'w'
                    ? '0 0 1px #000, 0 0 2px #000, 0 1px 1px #000'
                    : '0 0 1px #d8c39a, 0 1px 0 #ffffff44',
                  // ︎ fuerza render de TEXTO (no emoji) en iOS Safari -> respeta el color.
                  fontVariantEmoji: 'text' as React.CSSProperties['fontVariantEmoji'],
                }}>{GLYPH[cell.type] + '\uFE0E'}</span>}
                {isTarget && <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: 12, background: 'rgba(40,40,30,.35)' }} />}
              </div>
            );
          }))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          {!finished && mode === 'playing' && <button onClick={resign} style={btnGhost}>Rendirse</button>}
          {finished && <button onClick={leave} style={btnPrimary}>Volver al lobby</button>}
        </div>
        {note && <div style={{ textAlign: 'center', color: '#c8a86a', fontSize: 13, marginTop: 10 }}>{note}</div>}
      </div>
    );
  }

  // ---- LOBBY ----
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '8px 10px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ajedrez en línea</h1>
        <Link to="/ajedrez" style={{ color: '#a89a7e', fontSize: 13, textDecoration: 'none' }}>vs bots →</Link>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>Juega contra otra persona real, en tiempo real.</p>

      {note && <div style={{ color: '#c8a86a', fontSize: 13, margin: '8px 0' }}>{note}</div>}

      <button onClick={quickMatch} style={{ ...btnPrimary, width: '100%', padding: '15px', marginTop: 10, fontSize: 16 }}>
        🎲 Buscar oponente al azar
      </button>

      <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e', margin: '20px 0 8px' }}>Retar a alguien</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
          placeholder="correo / alias / código" style={inputStyle} />
        <button onClick={doSearch} style={btnGold}>Buscar</button>
      </div>
      {results.map((u) => (
        <div key={u.id} style={rowStyle}>
          <img src={avatarSrc(u.avatar_code)} alt="" style={avatarStyle} />
          <span style={{ color: '#ece6d6', fontWeight: 600 }}>{u.alias}</span>
          <button onClick={() => challenge(u)} style={{ ...btnGold, marginLeft: 'auto' }}>Retar ⚔️</button>
        </div>
      ))}

      {challenges.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#7ee0a6', margin: '20px 0 8px' }}>Te retaron</div>
          {challenges.map((m) => (
            <div key={m.id} style={rowStyle}>
              <span style={{ color: '#ece6d6' }}>{(m as MyGame).opp_alias ?? 'Alguien'} te retó a jugar ⚔️</span>
              <button onClick={() => accept(m)} style={{ ...btnPrimary, marginLeft: 'auto' }}>Aceptar</button>
            </div>
          ))}
        </>
      )}

      {myGames.filter((m) => m.status === 'active').length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e', margin: '20px 0 8px' }}>Partidas en curso</div>
          {myGames.filter((m) => m.status === 'active').map((m) => (
            <div key={m.id} style={rowStyle}>
              <span style={{ color: '#ece6d6' }}>vs {m.opp_alias ?? 'Rival'}</span>
              <button onClick={() => watchMatch(m, m.you_white, m.opp_alias ?? 'Rival')} style={{ ...btnGold, marginLeft: 'auto' }}>Reanudar →</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#ece6d6', fontSize: 14, outline: 'none' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginTop: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12 };
const avatarStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', background: '#2b2c34' };
const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', color: '#16241c', fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const btnGold: React.CSSProperties = { padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.12)', color: '#ecd9a5', fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)', color: 'rgba(232,226,212,.75)', cursor: 'pointer', fontSize: 13 };
