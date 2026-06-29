// =============================================================================
// Ajedrez ONLINE — humano vs humano en tiempo real (Supabase Realtime).
// Emparejamiento al azar, reto por correo/alias/código, retos entrantes, y el
// tablero sincronizado entre los dos jugadores.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chess, type Move } from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import { ChessPiece } from '../components/ChessPieces';
import {
  findUser, chessQuickMatch, chessChallenge, chessAccept, chessMove, chessResign,
  chessMyGames, subscribeMatch, subscribeChallenges, avatarSrc,
  chessCreateLink, chessJoinLink, chessRecentOpponents,
  type ChessMatch, type FoundUser, type MyGame, type RecentOpponent,
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
  const [recents, setRecents] = useState<RecentOpponent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null); // enlace de la invitación activa
  const [searchParams, setSearchParams] = useSearchParams();

  const unsubMatchRef = useRef<(() => void) | null>(null);

  // Lobby: retos entrantes + mis partidas + recientes.
  useEffect(() => {
    if (!myId) return;
    chessMyGames().then((games) => {
      setMyGames(games);
      const pending = games.filter((m) => m.status === 'waiting' && !m.you_white);
      if (pending.length) setChallenges((c) => {
        const have = new Set(c.map((x) => x.id));
        return [...pending.filter((p) => !have.has(p.id)), ...c];
      });
    }).catch(() => {});
    chessRecentOpponents().then(setRecents).catch(() => {});
    const off = subscribeChallenges(myId, (m) => {
      setChallenges((c) => [m, ...c.filter((x) => x.id !== m.id)]);
      setNote('¡Te retaron a una partida! Acéptalo abajo.');
    });
    return off;
  }, [myId]);

  // ¿Llegamos por un ENLACE de invitación? (?j=<matchId>) -> unirse y a jugar.
  useEffect(() => {
    const j = searchParams.get('j');
    if (!j || !myId) return;
    chessJoinLink(j)
      .then((m) => watchMatch(m, m.white_id === myId, 'Tu rival'))
      .catch(() => setNote('Ese enlace ya no está disponible (la partida se ocupó o expiró).'))
      .finally(() => { searchParams.delete('j'); setSearchParams(searchParams, { replace: true }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Construye el enlace y abre el menú de compartir del teléfono (o copia).
  async function shareLink(url: string) {
    const text = `Te reto a una partida de ajedrez en Domani ⚔️\n${url}`;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: 'Domani · Ajedrez', text }); return; } catch { /* canceló */ }
    }
    try { await navigator.clipboard.writeText(text); setNote('Enlace copiado. Pégalo en WhatsApp y envíaselo a tu amigo.'); }
    catch { setNote('Copia este enlace y envíalo: ' + url); }
  }

  // Retar por ENLACE: crea una partida abierta y comparte el link.
  async function invitarPorEnlace() {
    setNote(null);
    try {
      const m = await chessCreateLink();
      const url = `${window.location.origin}/ajedrez-online?j=${m.id}`;
      setShareUrl(url);
      watchMatch(m, true, 'tu amigo');
      await shareLink(url);
    } catch { setNote('No se pudo crear la invitación.'); }
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
    setMatch(null); setMode('lobby'); setSelected(null); setLegal([]); setShareUrl(null);
    chessMyGames().then(setMyGames).catch(() => {});
    chessRecentOpponents().then(setRecents).catch(() => {});
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
          {mode === 'searching'
            ? (shareUrl ? 'Esperando a que tu amigo entre por el enlace…' : 'Buscando un humano disponible…')
            : finished ? resultText : isMyTurn ? 'Tu turno' : 'Turno del rival…'}
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
                {cell && <ChessPiece type={cell.type} white={cell.color === 'w'} size="86%" />}
                {isTarget && <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: 12, background: 'rgba(40,40,30,.35)' }} />}
              </div>
            );
          }))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {mode === 'searching' && shareUrl && <button onClick={() => shareLink(shareUrl)} style={btnPrimary}>📲 Compartir de nuevo</button>}
          {mode === 'searching' && <button onClick={leave} style={btnGhost}>Cancelar</button>}
          {!finished && mode === 'playing' && <button onClick={resign} style={btnGhost}>Rendirse</button>}
          {finished && <button onClick={leave} style={btnPrimary}>Volver al lobby</button>}
        </div>
        {note && <div style={{ textAlign: 'center', color: '#c8a86a', fontSize: 13, marginTop: 10 }}>{note}</div>}
      </div>
    );
  }

  // ---- LOBBY: "Jugar con un amigo" ----
  const sectionLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e', margin: '22px 0 8px' };
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '8px 12px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Jugar con un amigo</h1>
        <Link to="/ajedrez" style={{ color: '#a89a7e', fontSize: 13, textDecoration: 'none' }}>← Salón</Link>
      </div>

      {note && <div style={{ color: '#c8a86a', fontSize: 13, margin: '10px 0', background: 'rgba(201,163,91,.08)', border: '1px solid rgba(201,163,91,.25)', borderRadius: 10, padding: '8px 12px' }}>{note}</div>}

      {/* HÉROE: invitar por enlace */}
      <button onClick={invitarPorEnlace} style={{ width: '100%', padding: '17px', marginTop: 12, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        ⚡ Retar a un amigo (enviar enlace)
      </button>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(232,226,212,.5)', marginTop: 6 }}>
        Le llega por WhatsApp y entra directo a la partida contigo.
      </div>

      <button onClick={quickMatch} style={{ ...btnGold, width: '100%', padding: '13px', marginTop: 14, fontSize: 15 }}>
        🎲 Jugar ya (con quien esté disponible)
      </button>

      {/* RETOS PARA TI */}
      {challenges.length > 0 && (
        <>
          <div style={{ ...sectionLabel, color: '#7ee0a6' }}>⚔️ Te retaron</div>
          {challenges.map((m) => (
            <div key={m.id} style={{ ...rowStyle, borderColor: 'rgba(126,224,166,.35)' }}>
              <span style={{ color: '#ece6d6' }}>{(m as MyGame).opp_alias ?? 'Alguien'} te reta</span>
              <button onClick={() => accept(m)} style={{ ...btnPrimary, marginLeft: 'auto' }}>Aceptar</button>
            </div>
          ))}
        </>
      )}

      {/* PARTIDAS EN CURSO */}
      {myGames.filter((m) => m.status === 'active').length > 0 && (
        <>
          <div style={sectionLabel}>Partidas en curso</div>
          {myGames.filter((m) => m.status === 'active').map((m) => (
            <div key={m.id} style={rowStyle}>
              <span style={{ color: '#ece6d6' }}>vs {m.opp_alias ?? 'Rival'}</span>
              <button onClick={() => watchMatch(m, m.you_white, m.opp_alias ?? 'Rival')} style={{ ...btnGold, marginLeft: 'auto' }}>Reanudar →</button>
            </div>
          ))}
        </>
      )}

      {/* RECIENTES */}
      {recents.length > 0 && (
        <>
          <div style={sectionLabel}>🕐 Recientes</div>
          {recents.map((u) => (
            <div key={u.id} style={rowStyle}>
              <img src={avatarSrc(u.avatar_code)} alt="" style={avatarStyle} />
              <span style={{ color: '#ece6d6', fontWeight: 600 }}>{u.alias}</span>
              <button onClick={() => challenge({ id: u.id, alias: u.alias, avatar_code: u.avatar_code })} style={{ ...btnGold, marginLeft: 'auto' }}>Revancha ⚔️</button>
            </div>
          ))}
        </>
      )}

      {/* BUSCAR POR ALIAS */}
      <div style={sectionLabel}>🔎 Buscar a alguien</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
          placeholder="alias o correo" style={inputStyle} />
        <button onClick={doSearch} style={btnGold}>Buscar</button>
      </div>
      {results.map((u) => (
        <div key={u.id} style={rowStyle}>
          <img src={avatarSrc(u.avatar_code)} alt="" style={avatarStyle} />
          <span style={{ color: '#ece6d6', fontWeight: 600 }}>{u.alias}</span>
          <button onClick={() => challenge(u)} style={{ ...btnGold, marginLeft: 'auto' }}>Retar ⚔️</button>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#ece6d6', fontSize: 14, outline: 'none' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginTop: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12 };
const avatarStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', background: '#2b2c34' };
const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', color: '#16241c', fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const btnGold: React.CSSProperties = { padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.12)', color: '#ecd9a5', fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)', color: 'rgba(232,226,212,.75)', cursor: 'pointer', fontSize: 13 };
