// =============================================================================
// Laboratorio de Cerebros — banco de pruebas de los 10 Pioneros
// -----------------------------------------------------------------------------
// (1) Mesa de póker en vivo con los 10 arquetipos jugando entre ellos, con sus
//     personalidades, tiempos humanos y voz.  (2) Duelo de ajedrez 1v1.
// (3) Ficha de cada Pionero con su comportamiento derivado.
// Todo determinista, sin LLM en runtime. Solo admin (herramienta de afinación).
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { bestMoveForLevel } from '../lib/chessBot';
import { ChessPiece } from '../components/ChessPieces';
import {
  startHand, applyAction, botAction, legalActions, pokerPersonaFromBrain,
  RANK_LABEL, isRed, type Game, type Player, type BotStyle, type Card,
} from '../lib/poker';
import {
  PIONEROS, pioneroByKey, chessFromBrain, pokerFromBrain,
  thinkDelayMs, vozDe, type BrainSpec,
} from '../lib/brains';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

const COLOR: Record<string, string> = {
  tiburon: '#d56b5b', don: '#c8a86a', veterano: '#9a8f78', pollo: '#6bb56b',
  tilteado: '#b55b9b', frio: '#5b9bd5', galan: '#d5a85b', ludopata: '#cf6f4a',
  roca: '#7d8a78', erratico: '#9a7fd5',
};

const START_STACK = 1000, SB = 5, BB = 10;

// hash determinista para gating de voz (0..1)
function roll(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 1000) / 1000;
}

type ChatLine = { nombre: string; color: string; line: string };

// =============================================================================
// MESA DE PÓKER
// =============================================================================
function PokerTable() {
  const [game, setGame] = useState<Game | null>(null);
  const [handNo, setHandNo] = useState(0);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [running, setRunning] = useState(false);
  const [reveal, setReveal] = useState(false);

  const runRef = useRef(false);
  const gameRef = useRef<Game | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => stop(), []);

  function stop() {
    runRef.current = false;
    setRunning(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function say(key: string, evento: string, seed: string) {
    const line = vozDe(key, evento, seed);
    if (!line) return;
    const b = pioneroByKey(key);
    setChat((c) => [...c.slice(-30), { nombre: b?.nombre ?? key, color: COLOR[key] ?? '#c8a86a', line }]);
  }

  function maybeSay(p: Player, evento: string, seed: string, prob?: number) {
    const b = pioneroByKey(p.brainKey ?? '');
    if (!b) return;
    const pr = prob ?? b.voz.locuacidad * 0.6;
    if (roll(seed + evento) < pr) say(b.key, evento, seed);
  }

  function announceEnd(g: Game) {
    const w = g.winners[0];
    const wp = w && g.players.find((x) => x.id === w.id);
    if (wp?.brainKey) say(wp.brainKey, 'gana', 'end' + handNo);
  }

  function tick() {
    if (!runRef.current) return;
    const g = gameRef.current;
    if (!g) return;
    if (g.handOver) { timerRef.current = window.setTimeout(nextHand, 1900); return; }

    const p = g.players[g.toAct];
    const b = pioneroByKey(p.brainKey ?? '');
    const la = legalActions(g);
    const ratio = la.callAmount / (p.stack + la.callAmount + 1);
    const crit = Math.min(1, ratio * 1.6);
    const seed = `${p.id}|${g.phase}|${Math.round(g.pot)}|${g.board.length}`;

    const action = botAction(g);
    if (action.type === 'raise') {
      const allIn = action.to >= p.bet + p.stack;
      maybeSay(p, allIn ? 'farol' : 'apuesta', seed, allIn ? 0.85 : undefined);
    }
    const ng = applyAction(g, action);
    gameRef.current = ng;
    setGame(ng);
    if (ng.handOver) announceEnd(ng);

    const delay = b ? thinkDelayMs(b, crit, seed) : 600;
    timerRef.current = window.setTimeout(tick, Math.max(450, Math.min(delay, 1500)));
  }

  function nextHand() {
    if (!runRef.current) return;
    const g = gameRef.current;
    if (!g) return;
    const players = g.players.map((p) => ({ ...p, stack: p.stack <= 0 ? START_STACK : p.stack }));
    const dealer = (g.dealer + 1) % players.length;
    const ng = startHand(players, dealer, SB, BB);
    gameRef.current = ng;
    setGame(ng);
    setHandNo((h) => h + 1);
    timerRef.current = window.setTimeout(tick, 700);
  }

  function start() {
    stop();
    const players: Player[] = PIONEROS.map((b) => ({
      id: b.key, name: b.nombre, isBot: true, style: 'normal' as BotStyle,
      stack: START_STACK, bet: 0, hole: [], folded: false, allIn: false, acted: false,
      persona: pokerPersonaFromBrain(b), tiltProne: b.debilidades.tilt, brainKey: b.key,
    }));
    const ng = startHand(players, 0, SB, BB);
    gameRef.current = ng;
    setGame(ng);
    setHandNo(1);
    setChat([]);
    runRef.current = true;
    setRunning(true);
    timerRef.current = window.setTimeout(tick, 700);
  }

  const g = game;
  const showCards = (p: Player) => reveal || (g?.handOver && !p.folded);

  return (
    <div style={panel}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>🃏 Mesa de los 10 Pioneros</h2>
        {!running
          ? <button onClick={start} style={btnPrimary}>▶ Repartir</button>
          : <button onClick={stop} style={btnGhost}>■ Detener</button>}
        <button onClick={() => setReveal((r) => !r)} style={btnGhost}>👁 {reveal ? 'Ocultar' : 'Mostrar'} cartas</button>
        {g && <span style={{ fontSize: 13, color: '#9a8f78' }}>Mano #{handNo} · {g.phase} · Bote ⟡{g.pot}</span>}
      </div>

      {/* mesa central: board + pot */}
      {g && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '10px 0 16px' }}>
          {g.board.length === 0
            ? <span style={{ color: '#6a6253', fontSize: 13 }}>— sin cartas comunitarias —</span>
            : g.board.map((c, i) => <Mini key={i} c={c} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* asientos */}
        <div style={{ flex: 2, minWidth: 320, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 8 }}>
          {g?.players.map((p, i) => {
            const active = i === g.toAct && !g.handOver;
            const isWinner = g.handOver && g.winners.some((w) => w.id === p.id);
            return (
              <div key={p.id} style={{
                background: isWinner ? '#1d2417' : '#171410',
                border: `1px solid ${active ? COLOR[p.id] : '#322c22'}`,
                boxShadow: active ? `0 0 0 1px ${COLOR[p.id]}` : 'none',
                borderLeft: `3px solid ${COLOR[p.id] ?? '#322c22'}`,
                borderRadius: 8, padding: '8px 10px', opacity: p.folded ? 0.42 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#e8dcc0' }}>{p.name}</strong>
                  <span title="tilt" style={{ width: 8, height: 8, borderRadius: 8, background: `rgba(213,91,155,${(p.tilt ?? 0).toFixed(2)})`, border: '1px solid #3a3327' }} />
                </div>
                <div style={{ display: 'flex', gap: 5, margin: '5px 0' }}>
                  <Mini c={p.hole[0]} hidden={!showCards(p)} small />
                  <Mini c={p.hole[1]} hidden={!showCards(p)} small />
                  {p.bet > 0 && <span style={{ alignSelf: 'center', fontSize: 11, color: '#e8c87a', marginLeft: 4 }}>apuesta ⟡{p.bet}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#9a8f78' }}>⟡{p.stack}</span>
                  <span style={{ color: active ? COLOR[p.id] : '#7a7160' }}>
                    {active ? '● pensando…' : (p.lastAction ?? '—')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* chat */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 10, padding: 10, height: 360, overflowY: 'auto', fontSize: 13 }}>
            {chat.length === 0
              ? <span style={{ color: '#6a6253' }}>El chat de la mesa aparecerá aquí…</span>
              : chat.map((l, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <strong style={{ color: l.color }}>{l.nombre}:</strong>{' '}
                  <span style={{ color: '#cabfa6' }}>{l.line}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      {!g && <p style={{ color: '#9a8f78', fontSize: 13 }}>Dale «Repartir» y míralos jugar. Cada quien con su cabeza.</p>}
    </div>
  );
}

function Mini({ c, hidden, small }: { c?: Card; hidden?: boolean; small?: boolean }) {
  const w = small ? 26 : 34, h = small ? 36 : 46, fs = small ? 13 : 16;
  if (hidden || !c) {
    return <div style={{ width: w, height: h, borderRadius: 5, background: 'repeating-linear-gradient(45deg,#3a2f22,#3a2f22 4px,#2a2118 4px,#2a2118 8px)', border: '1px solid #4a3f30' }} />;
  }
  return (
    <div style={{ width: w, height: h, borderRadius: 5, background: '#f4ecd8', border: '1px solid #b8a98a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, color: isRed(c.s) ? '#b5311f' : '#1a1510' }}>
      {RANK_LABEL[c.r]}{c.s}
    </div>
  );
}

// =============================================================================
// DUELO DE AJEDREZ
// =============================================================================
function ChessDuel() {
  const [whiteKey, setWhiteKey] = useState('tiburon');
  const [blackKey, setBlackKey] = useState('don');
  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runRef = useRef(false);
  const gameRef = useRef(new Chess());
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => stop(), []);

  function stop() {
    runRef.current = false;
    setRunning(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  function say(key: string, evento: string, seed: string) {
    const line = vozDe(key, evento, seed);
    if (!line) return;
    const b = pioneroByKey(key);
    setChat((c) => [...c.slice(-24), { nombre: b?.nombre ?? key, color: COLOR[key] ?? '#c8a86a', line }]);
  }
  function finish(game: Chess) {
    runRef.current = false; setRunning(false);
    if (game.isCheckmate()) {
      const loser = game.turn();
      const winK = loser === 'w' ? blackKey : whiteKey;
      const loseK = loser === 'w' ? whiteKey : blackKey;
      say(winK, 'gana', 'end'); say(loseK, 'pierde', 'end');
      setResult(`♚ Mate · gana ${pioneroByKey(winK)?.nombre}`);
    } else if (game.isDraw()) setResult('½ Tablas');
    else setResult('Fin de la partida');
  }
  function step() {
    if (!runRef.current) return;
    const game = gameRef.current;
    if (game.isGameOver() || game.history().length >= 180) { finish(game); return; }
    const turn = game.turn();
    const key = turn === 'w' ? whiteKey : blackKey;
    const b = pioneroByKey(key);
    if (!b) { stop(); return; }
    const mv = bestMoveForLevel(game.fen(), chessFromBrain(b).level);
    if (!mv) { finish(game); return; }
    const applied = game.move({ from: mv.from, to: mv.to, promotion: (mv as { promotion?: string }).promotion });
    if (!applied) { finish(game); return; }
    setFen(game.fen());
    setMoves((m) => [...m, applied.san]);
    const seed = String(game.history().length);
    const isCap = applied.flags.includes('c') || applied.flags.includes('e');
    const isCheck = game.inCheck();
    if (isCheck) say(key, 'pincha', seed);
    else if (isCap && roll(key + seed) < b.voz.locuacidad) say(key, 'apuesta', seed);
    const crit = isCheck ? 0.9 : isCap ? 0.6 : 0.15;
    const delay = thinkDelayMs(b, crit, key + seed);
    timerRef.current = window.setTimeout(step, Math.max(280, Math.min(delay, 2000)));
  }
  function start() {
    stop();
    const game = new Chess();
    gameRef.current = game;
    setFen(game.fen()); setMoves([]); setChat([]); setResult(null);
    say(whiteKey, 'saludo', 'w'); say(blackKey, 'saludo', 'b');
    runRef.current = true; setRunning(true);
    timerRef.current = window.setTimeout(step, 500);
  }
  const board = useMemo(() => new Chess(fen).board(), [fen]);

  return (
    <div style={panel}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>⚔️ Duelo de ajedrez</h2>
        <label style={{ fontSize: 13 }}>Blancas{' '}
          <select value={whiteKey} onChange={(e) => setWhiteKey(e.target.value)} disabled={running} style={sel}>
            {PIONEROS.map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>Negras{' '}
          <select value={blackKey} onChange={(e) => setBlackKey(e.target.value)} disabled={running} style={sel}>
            {PIONEROS.map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
          </select>
        </label>
        {!running ? <button onClick={start} style={btnPrimary}>▶ Jugar</button> : <button onClick={stop} style={btnGhost}>■ Detener</button>}
        {result && <span style={{ fontSize: 14, color: '#e8c87a' }}>{result}</span>}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 40px)', border: '2px solid #3a3327' }}>
          {board.map((row, r) => row.map((sq, c) => {
            const dark = (r + c) % 2 === 1;
            return (
              <div key={`${r}-${c}`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark ? '#7d6549' : '#d8c39a', fontSize: 27 }}>
                {sq && <ChessPiece type={sq.type} white={sq.color === 'w'} size="84%" />}
              </div>
            );
          }))}
        </div>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 10, padding: 10, height: 200, overflowY: 'auto', fontSize: 13 }}>
            {chat.length === 0 ? <span style={{ color: '#6a6253' }}>El chat de la mesa aparecerá aquí…</span>
              : chat.map((l, i) => <div key={i} style={{ marginBottom: 4 }}><strong style={{ color: l.color }}>{l.nombre}:</strong> <span style={{ color: '#cabfa6' }}>{l.line}</span></div>)}
          </div>
          <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 10, padding: 10, fontSize: 12, color: '#9a8f78', maxHeight: 90, overflowY: 'auto' }}>
            <strong style={{ color: '#a89a7e' }}>Jugadas:</strong> {moves.join('  ') || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FICHAS
// =============================================================================
function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ width: 64, color: '#9a8f78' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#2a2620', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(v * 100)}%`, height: '100%', background: color }} />
      </div>
      <span style={{ width: 28, textAlign: 'right', color: '#c9bfa6' }}>{v.toFixed(2)}</span>
    </div>
  );
}
function PioneroCard({ b }: { b: BrainSpec }) {
  const chess = chessFromBrain(b);
  const pkr = pokerFromBrain(b);
  return (
    <div style={{ background: '#171410', border: '1px solid #322c22', borderLeft: `3px solid ${COLOR[b.key]}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: '#e8dcc0', fontSize: 16 }}>{b.nombre}</strong>
        <span style={{ fontSize: 11, color: '#8a7f68', textTransform: 'uppercase' }}>{b.tier}</span>
      </div>
      <div style={{ fontSize: 12, color: '#a89a7e', fontStyle: 'italic', margin: '2px 0 10px' }}>«{b.lema}»</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={chip}>♟ nivel {chess.level}/5</span>
        <span style={chip}>🃏 {pkr.style}</span>
        <span style={chip}>fav: {b.juegoFavorito}</span>
      </div>
      <div style={{ display: 'grid', gap: 4, marginBottom: 10 }}>
        <Bar label="cognición" v={b.fortalezas.cognicion} color="#5b9bd5" />
        <Bar label="agresiv." v={b.estilo.agresividad} color="#d56b5b" />
        <Bar label="farol" v={b.estilo.farol} color="#d5a85b" />
        <Bar label="disciplina" v={b.fortalezas.disciplina} color="#6bb56b" />
        <Bar label="tilt" v={b.debilidades.tilt} color="#b55b9b" />
        <Bar label="codicia" v={b.debilidades.codicia} color="#b5755b" />
        <Bar label="velocidad" v={b.timing.velocidadBase} color="#5bb5b0" />
        <Bar label="habla" v={b.voz.locuacidad} color="#9a8fd5" />
      </div>
      <div style={{ fontSize: 11, color: '#c9bfa6' }}>
        <div>— {vozDe(b.key, 'saludo', 'demo') ?? ''}</div>
        <div>— {vozDe(b.key, 'gana', 'demo') ?? ''}</div>
      </div>
    </div>
  );
}

// =============================================================================
export function LaboratorioScreen() {
  const [mode, setMode] = useState<'poker' | 'ajedrez'>('poker');
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 18px', color: '#e8dcc0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Laboratorio de Cerebros</h1>
        <Link to="/" style={{ color: '#a89a7e', fontSize: 13 }}>← volver</Link>
      </div>
      <p style={{ color: '#9a8f78', marginTop: 0, fontSize: 13 }}>
        Los 10 Pioneros y su comportamiento derivado. Ponlos a jugar entre ellos.
        Todo determinista, sin IA generativa en tiempo real.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('poker')} style={mode === 'poker' ? tabOn : tabOff}>🃏 Mesa de póker</button>
        <button onClick={() => setMode('ajedrez')} style={mode === 'ajedrez' ? tabOn : tabOff}>⚔️ Duelo de ajedrez</button>
      </div>

      {mode === 'poker' ? <PokerTable /> : <ChessDuel />}

      <h2 style={{ fontSize: 18, marginTop: 26 }}>Los 10 Pioneros</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {PIONEROS.map((b) => <PioneroCard key={b.key} b={b} />)}
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: '#13110d', border: '1px solid #322c22', borderRadius: 14, padding: 16 };
const chip: React.CSSProperties = { fontSize: 11, color: '#d6c9a8', background: '#241f18', border: '1px solid #3a3327', borderRadius: 999, padding: '2px 9px' };
const sel: React.CSSProperties = { background: '#221d16', color: '#e8dcc0', border: '1px solid #3a3327', borderRadius: 8, padding: '5px 8px' };
const btnPrimary: React.CSSProperties = { background: '#c8a86a', color: '#1a1510', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', color: '#d6c9a8', border: '1px solid #5a5040', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' };
const tabOn: React.CSSProperties = { ...btnPrimary };
const tabOff: React.CSSProperties = { ...btnGhost };
