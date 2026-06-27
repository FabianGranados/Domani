// =============================================================================
// Laboratorio de Cerebros — banco de pruebas de los 10 Pioneros
// -----------------------------------------------------------------------------
// Dos cosas: (1) ficha de cada arquetipo con su comportamiento DERIVADO (nivel
// de ajedrez, estilo de poker, ritmo, voz); (2) un duelo de ajedrez en vivo
// donde dos Pioneros juegan solos, con sus tiempos humanos y su voz. Todo
// determinista, sin LLM. Solo admin (es una herramienta de afinación).
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { bestMoveForLevel } from '../lib/chessBot';
import {
  PIONEROS,
  pioneroByKey,
  chessFromBrain,
  pokerFromBrain,
  thinkDelayMs,
  vozDe,
  type BrainSpec,
} from '../lib/brains';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

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
    <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: '#e8dcc0', fontSize: 16 }}>{b.nombre}</strong>
        <span style={{ fontSize: 11, color: '#8a7f68', textTransform: 'uppercase' }}>{b.tier}</span>
      </div>
      <div style={{ fontSize: 12, color: '#a89a7e', fontStyle: 'italic', margin: '2px 0 10px' }}>«{b.lema}»</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={chip}>♟ Ajedrez nivel {chess.level}/5</span>
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

      <div style={{ fontSize: 11, color: '#8a7f68' }}>
        <div style={{ color: '#c9bfa6' }}>— {vozDe(b.key, 'saludo', 'demo') ?? ''}</div>
        <div style={{ color: '#c9bfa6' }}>— {vozDe(b.key, 'gana', 'demo') ?? ''}</div>
      </div>
    </div>
  );
}

const chip: React.CSSProperties = {
  fontSize: 11, color: '#d6c9a8', background: '#241f18',
  border: '1px solid #3a3327', borderRadius: 999, padding: '2px 9px',
};

type ChatLine = { nombre: string; line: string };

export function LaboratorioScreen() {
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

  useEffect(() => () => stop(), []); // limpiar al desmontar

  function stop() {
    runRef.current = false;
    setRunning(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function say(key: string, evento: string, seed: string) {
    const line = vozDe(key, evento, seed);
    if (!line) return;
    const nombre = pioneroByKey(key)?.nombre ?? key;
    setChat((c) => [...c.slice(-24), { nombre, line }]);
  }

  function finish(g: Chess) {
    runRef.current = false;
    setRunning(false);
    if (g.isCheckmate()) {
      const loser = g.turn();
      const winK = loser === 'w' ? blackKey : whiteKey;
      const loseK = loser === 'w' ? whiteKey : blackKey;
      say(winK, 'gana', 'end');
      say(loseK, 'pierde', 'end');
      setResult(`♚ Mate · gana ${pioneroByKey(winK)?.nombre}`);
    } else if (g.isDraw()) {
      setResult('½ Tablas');
    } else {
      setResult('Fin de la partida');
    }
  }

  function step() {
    if (!runRef.current) return;
    const g = gameRef.current;
    if (g.isGameOver() || g.history().length >= 180) { finish(g); return; }
    const turn = g.turn();
    const key = turn === 'w' ? whiteKey : blackKey;
    const brain = pioneroByKey(key);
    if (!brain) { stop(); return; }
    const level = chessFromBrain(brain).level;
    const mv = bestMoveForLevel(g.fen(), level);
    if (!mv) { finish(g); return; }
    const applied = g.move({ from: mv.from, to: mv.to, promotion: (mv as { promotion?: string }).promotion });
    if (!applied) { finish(g); return; }
    setFen(g.fen());
    setMoves((m) => [...m, applied.san]);

    const seed = String(g.history().length);
    const isCap = applied.flags.includes('c') || applied.flags.includes('e');
    const isCheck = g.inCheck();
    // habla según locuacidad (determinista por jugada+arquetipo)
    const talkRoll = ((vozDe(key, 'x', seed)?.length ?? 0) + g.history().length) % 5;
    if (isCheck) say(key, 'pincha', seed);
    else if (isCap && talkRoll < brain.voz.locuacidad * 5) say(key, 'apuesta', seed);

    const crit = isCheck ? 0.9 : isCap ? 0.6 : 0.15;
    const delay = thinkDelayMs(brain, crit, key + seed);
    timerRef.current = window.setTimeout(step, Math.max(280, Math.min(delay, 2000)));
  }

  function start() {
    stop();
    const g = new Chess();
    gameRef.current = g;
    setFen(g.fen());
    setMoves([]);
    setChat([]);
    setResult(null);
    say(whiteKey, 'saludo', 'w');
    say(blackKey, 'saludo', 'b');
    runRef.current = true;
    setRunning(true);
    timerRef.current = window.setTimeout(step, 500);
  }

  const board = useMemo(() => new Chess(fen).board(), [fen]);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 18px', color: '#e8dcc0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Laboratorio de Cerebros</h1>
        <Link to="/" style={{ color: '#a89a7e', fontSize: 13 }}>← volver</Link>
      </div>
      <p style={{ color: '#9a8f78', marginTop: 0, fontSize: 13 }}>
        Los 10 Pioneros y su comportamiento derivado. Abajo, ponlos a jugar entre ellos.
        Todo determinista, sin IA generativa en tiempo real.
      </p>

      {/* DUELO */}
      <div style={{ background: '#13110d', border: '1px solid #322c22', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>⚔️ Duelo de ajedrez</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <label style={{ fontSize: 13 }}>
            Blancas:{' '}
            <select value={whiteKey} onChange={(e) => setWhiteKey(e.target.value)} disabled={running} style={sel}>
              {PIONEROS.map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Negras:{' '}
            <select value={blackKey} onChange={(e) => setBlackKey(e.target.value)} disabled={running} style={sel}>
              {PIONEROS.map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
            </select>
          </label>
          {!running
            ? <button onClick={start} style={btnPrimary}>▶ Jugar</button>
            : <button onClick={stop} style={btnGhost}>■ Detener</button>}
          {result && <span style={{ fontSize: 14, color: '#e8c87a' }}>{result}</span>}
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {/* tablero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 44px)', border: '2px solid #3a3327' }}>
            {board.map((row, r) =>
              row.map((sq, c) => {
                const dark = (r + c) % 2 === 1;
                return (
                  <div key={`${r}-${c}`} style={{
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: dark ? '#7d6549' : '#d8c39a', fontSize: 30, lineHeight: 1,
                  }}>
                    {sq && (
                      <span style={{
                        color: sq.color === 'w' ? '#fbf3df' : '#161310',
                        textShadow: sq.color === 'w' ? '0 1px 1px #00000088' : '0 1px 0 #ffffff22',
                      }}>{GLYPH[sq.type]}</span>
                    )}
                  </div>
                );
              }),
            )}
          </div>

          {/* chat de la mesa */}
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 10, padding: 10, height: 220, overflowY: 'auto', fontSize: 13 }}>
              {chat.length === 0
                ? <span style={{ color: '#6a6253' }}>El chat de la mesa aparecerá aquí…</span>
                : chat.map((l, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#c8a86a' }}>{l.nombre}:</strong>{' '}
                    <span style={{ color: '#cabfa6' }}>{l.line}</span>
                  </div>
                ))}
            </div>
            <div style={{ background: '#171410', border: '1px solid #322c22', borderRadius: 10, padding: 10, fontSize: 12, color: '#9a8f78', maxHeight: 90, overflowY: 'auto' }}>
              <strong style={{ color: '#a89a7e' }}>Jugadas:</strong> {moves.join('  ') || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* FICHAS */}
      <h2 style={{ fontSize: 18 }}>Los 10 Pioneros</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {PIONEROS.map((b) => <PioneroCard key={b.key} b={b} />)}
      </div>
    </div>
  );
}

const sel: React.CSSProperties = {
  background: '#221d16', color: '#e8dcc0', border: '1px solid #3a3327', borderRadius: 8, padding: '5px 8px',
};
const btnPrimary: React.CSSProperties = {
  background: '#c8a86a', color: '#1a1510', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  background: 'transparent', color: '#d6c9a8', border: '1px solid #5a5040', borderRadius: 8, padding: '7px 16px', cursor: 'pointer',
};
