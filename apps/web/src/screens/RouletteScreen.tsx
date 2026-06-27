import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, spinRoulette, type RouletteWagerInput } from '../lib/api';
import { colorOf } from '@domani/game-roulette';
import { RouletteWheel } from '../lib/rouletteWheel';

// Fichas (Aurelios). Valores del prototipo; ajustables a la economía.
const CHIPS = [
  { val: 5, cls: 'c5' },
  { val: 25, cls: 'c25' },
  { val: 100, cls: 'c100' },
  { val: 500, cls: 'c500' },
];

const BET_WINDOW = 6000; // ms de ventana "hagan sus apuestas"
const DEFAULT_HINT = 'Pulsa LANZAR — puedes seguir apostando mientras gira';

type Phase = 'idle' | 'spinning' | 'closed' | 'result';

interface SpinOutcome {
  number: number;
  staked: number;
  net: number;
  balance: number;
  voided?: boolean;
}

/** id de celda del tapete -> apuesta para el servidor */
function toWager(id: string, stake: number): RouletteWagerInput {
  if (id.startsWith('num-')) return { type: 'straight', value: Number(id.slice(4)), stake };
  if (id.startsWith('dozen-')) return { type: 'dozen', value: Number(id.slice(6)), stake };
  if (id.startsWith('column-')) return { type: 'column', value: Number(id.slice(7)), stake };
  return { type: id, stake };
}

export function RouletteScreen() {
  const { user, refreshProfile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<RouletteWheel | null>(null);
  const betsRef = useRef<Record<string, number>>({});
  const outcomeRef = useRef<SpinOutcome | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [balance, setBalance] = useState(0);
  const [selectedChip, setSelectedChip] = useState(5);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [betsOpen, setBetsOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [result, setResult] = useState<SpinOutcome | null>(null);
  const [hint, setHint] = useState(DEFAULT_HINT);
  const [error, setError] = useState<string | null>(null);

  // saldo inicial
  useEffect(() => {
    if (!user) return;
    getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
  }, [user]);

  // montar la rueda
  useEffect(() => {
    if (!canvasRef.current) return;
    const wheel = new RouletteWheel(canvasRef.current);
    wheelRef.current = wheel;
    wheel.onLanded(onLanded);
    wheel.start();
    return () => {
      wheel.destroy();
      wheelRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalStaked = useCallback(
    () => Object.values(betsRef.current).reduce((a, b) => a + b, 0),
    []
  );

  function flashHint(msg: string) {
    setHint(msg);
    setTimeout(() => setHint(DEFAULT_HINT), 1800);
  }

  function placeBet(id: string) {
    if (!betsOpen) return;
    if (balance < selectedChip) {
      flashHint('Fichas insuficientes');
      return;
    }
    setBalance((b) => b - selectedChip);
    setBets((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + selectedChip };
      betsRef.current = next;
      return next;
    });
  }

  function clearBets() {
    if (!betsOpen) return;
    setBalance((b) => b + totalStaked());
    setBets({});
    betsRef.current = {};
  }

  // LANZAR: arranca la bola y abre la ventana de apuestas.
  function launch() {
    if (phase !== 'idle' && phase !== 'result') return;
    setError(null);
    setResult(null);
    setPhase('spinning');
    setBetsOpen(true);
    wheelRef.current?.launch();
    const end = performance.now() + BET_WINDOW;
    setTimeLeft(BET_WINDOW);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, end - performance.now());
      setTimeLeft(rem);
      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        noVaMas();
      }
    }, 80);
  }

  // "¡NO VA MÁS!": cierra apuestas y pide el número al servidor.
  async function noVaMas() {
    setBetsOpen(false);
    setPhase('closed');
    wheelRef.current?.settle();

    const current = betsRef.current;
    const ids = Object.keys(current);

    // Sin apuestas -> giro cosmético (sin tocar Aurelios).
    if (ids.length === 0) {
      const n = Math.floor(Math.random() * 37);
      outcomeRef.current = { number: n, staked: 0, net: 0, balance, voided: true };
      wheelRef.current?.lockTo(n);
      return;
    }

    const staked = Object.values(current).reduce((a, b) => a + b, 0);
    const wagers = ids.map((id) => toWager(id, current[id]));
    try {
      const r = await spinRoulette(wagers);
      outcomeRef.current = {
        number: r.result_number,
        staked: r.total_staked,
        net: r.net,
        balance: r.balance,
      };
      wheelRef.current?.lockTo(r.result_number);
    } catch (err) {
      // Falló: el servidor NO debitó. Reembolsamos lo descontado localmente.
      setBalance((b) => b + staked);
      setError(err instanceof Error ? err.message : 'No se pudo girar');
      const n = Math.floor(Math.random() * 37);
      outcomeRef.current = { number: n, staked: 0, net: 0, balance: balance + staked, voided: true };
      wheelRef.current?.lockTo(n);
    }
  }

  // La bola aterrizó: mostramos el resultado autoritativo.
  function onLanded(n: number) {
    const out = outcomeRef.current ?? { number: n, staked: 0, net: 0, balance, voided: true };
    setResult(out);
    setHistory((h) => [out.number, ...h].slice(0, 18));
    setPhase('result');
    if (!out.voided) {
      setBalance(out.balance);
      setBets({});
      betsRef.current = {};
      refreshProfile();
    }
    outcomeRef.current = null;
    // Rehabilitar para la siguiente ronda.
    setTimeout(() => {
      setBetsOpen(true);
      setPhase('idle');
    }, 2400);
  }

  const announceActive = phase === 'spinning' || phase === 'closed';
  const secs = Math.ceil(timeLeft / 1000);
  const closing = phase === 'spinning' && timeLeft <= 1800;

  return (
    <div className="rl-root">
      <div className="rl-topbar">
        <div className="rl-pill">
          <div className="rl-lab">Aurelios</div>
          <div className="rl-val">⟡ {balance}</div>
        </div>
        <div className="rl-pill">
          <div className="rl-lab">En la mesa</div>
          <div className="rl-val">{Object.values(bets).reduce((a, b) => a + b, 0)}</div>
        </div>
      </div>

      <div className="rl-scene">
        <canvas ref={canvasRef} className="rl-canvas" width={1040} height={780} />

        {announceActive && (
          <div className="rl-announce show">
            <div className={`rl-txt ${phase === 'closed' ? 'closed' : ''}`}>
              {phase === 'closed' ? '¡NO VA MÁS!' : `¡HAGAN SUS APUESTAS!  ${secs}`}
            </div>
            {phase === 'spinning' && (
              <div className="rl-timerbar">
                <i
                  className={closing ? 'closing' : ''}
                  style={{ width: `${(timeLeft / BET_WINDOW) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {result && phase === 'result' && (
          <div className="rl-result show">
            <span className={resultColorClass(result.number)}>
              {result.number} · {colorLabel(result.number)}
            </span>
            <div
              className="rl-netline"
              style={{ color: result.voided ? '#caa24a' : result.net > 0 ? '#5ad17e' : result.net < 0 ? '#ef5350' : '#caa24a' }}
            >
              {result.voided
                ? error
                  ? 'Giro anulado'
                  : 'Sin apuestas'
                : result.net > 0
                  ? `¡GANAS +${result.net}!`
                  : result.net < 0
                    ? `${result.net} Aurelios`
                    : 'EMPATE'}
            </div>
          </div>
        )}

        <div className="rl-hint">{hint}</div>
      </div>

      {/* ===== Tapete ===== */}
      <div className="rl-felt-wrap">
        <div className={`rl-felt ${!betsOpen ? 'locked' : ''}`}>
          {/* fila superior: 0 + grid de números + columnas */}
          <div className="rl-felt-row">
            <div className="rl-num green rl-zero" onClick={() => placeBet('num-0')}>
              0{chipBadge(bets['num-0'])}
            </div>
            <div className="rl-numgrid">
              {buildGridNumbers().map((num) => (
                <div
                  key={num}
                  className={`rl-num ${colorOf(num)}`}
                  onClick={() => placeBet(`num-${num}`)}
                >
                  {num}
                  {chipBadge(bets[`num-${num}`])}
                </div>
              ))}
            </div>
            <div className="rl-colwrap">
              {[3, 2, 1].map((col) => (
                <div key={col} className="rl-out rl-col2" onClick={() => placeBet(`column-${col}`)}>
                  2:1{chipBadge(bets[`column-${col}`])}
                </div>
              ))}
            </div>
          </div>

          {/* docenas */}
          <div className="rl-felt-row rl-indent">
            {[['1ª 12', 1], ['2ª 12', 2], ['3ª 12', 3]].map(([label, d]) => (
              <div key={d} className="rl-out rl-dozen" onClick={() => placeBet(`dozen-${d}`)}>
                {label}
                {chipBadge(bets[`dozen-${d}`])}
              </div>
            ))}
          </div>

          {/* apuestas parejas */}
          <div className="rl-felt-row rl-indent">
            <div className="rl-out rl-even6" onClick={() => placeBet('low')}>1-18{chipBadge(bets['low'])}</div>
            <div className="rl-out rl-even6" onClick={() => placeBet('even')}>PAR{chipBadge(bets['even'])}</div>
            <div className="rl-out rl-even6 red" onClick={() => placeBet('red')}>
              <span className="rl-dia r" />{chipBadge(bets['red'])}
            </div>
            <div className="rl-out rl-even6 black" onClick={() => placeBet('black')}>
              <span className="rl-dia b" />{chipBadge(bets['black'])}
            </div>
            <div className="rl-out rl-even6" onClick={() => placeBet('odd')}>IMPAR{chipBadge(bets['odd'])}</div>
            <div className="rl-out rl-even6" onClick={() => placeBet('high')}>19-36{chipBadge(bets['high'])}</div>
          </div>
        </div>
      </div>

      {/* historial */}
      <div className="rl-hist">
        {history.map((n, i) => (
          <div key={i} className={`rl-hc ${colorOf(n)}`}>{n}</div>
        ))}
      </div>

      {/* fichas + acciones */}
      <div className="rl-barbottom">
        <div className="rl-chips">
          {CHIPS.map((c) => (
            <div
              key={c.val}
              className={`rl-chip ${c.cls} ${selectedChip === c.val ? 'sel' : ''}`}
              onClick={() => setSelectedChip(c.val)}
            >
              {c.val}
            </div>
          ))}
        </div>
        <button className="rl-btn sec" onClick={clearBets} disabled={!betsOpen}>
          Limpiar
        </button>
        <button className="rl-btn" onClick={launch} disabled={phase === 'spinning' || phase === 'closed'}>
          LANZAR
        </button>
      </div>

      <p className="rl-legal">
        Ruleta europea de azar. Se juega únicamente con Aurelios, fichas de fantasía sin valor
        monetario. Nunca hay dinero real ni premios canjeables. Solo +18.
      </p>
    </div>
  );
}

// ---------- helpers de presentación ----------
function chipBadge(amount?: number) {
  if (!amount) return null;
  return <div className="rl-placed">{amount}</div>;
}
function resultColorClass(n: number) {
  const c = colorOf(n);
  return c === 'red' ? 'r' : c === 'black' ? 'b' : 'g';
}
function colorLabel(n: number) {
  const c = colorOf(n);
  return c === 'red' ? 'ROJO' : c === 'black' ? 'NEGRO' : 'VERDE';
}
/** Números en el orden del grid: columna por columna, fila superior = múltiplos de 3. */
function buildGridNumbers(): number[] {
  const out: number[] = [];
  for (let col = 0; col < 12; col++) {
    for (let r = 0; r < 3; r++) out.push(col * 3 + (3 - r));
  }
  return out;
}
