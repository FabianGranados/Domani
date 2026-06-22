import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { spinRouletteFree, type RouletteSpinResult } from '../lib/api';
import { isRed } from '@domani/game-roulette';

const OUTSIDE_BETS: { type: string; label: string }[] = [
  { type: 'red', label: 'Rojo' },
  { type: 'black', label: 'Negro' },
  { type: 'even', label: 'Par' },
  { type: 'odd', label: 'Impar' },
  { type: 'low', label: '1–18' },
  { type: 'high', label: '19–36' },
];

export function RouletteScreen() {
  const { refreshProfile } = useAuth();
  const [betType, setBetType] = useState('red');
  const [straight, setStraight] = useState(0);
  const [result, setResult] = useState<RouletteSpinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    setBusy(true);
    setError(null);
    try {
      const r = await spinRouletteFree(
        betType,
        betType === 'straight' ? straight : undefined
      );
      setResult(r);
      if (r.reward_aurelios > 0) await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo girar');
    } finally {
      setBusy(false);
    }
  }

  const resultClass = result
    ? result.result_number === 0
      ? 'green'
      : isRed(result.result_number)
        ? 'red'
        : 'black'
    : '';

  return (
    <div>
      <h1 className="page-title">Ruleta del Círculo</h1>
      <p className="muted">
        Giro de <strong>entrada gratuita</strong>: no arriesgas Aurelios. Si aciertas,
        la banca te regala Aurelios. Hasta 20 giros gratis por día.
      </p>

      <div className="grid cols-2" style={{ alignItems: 'start', maxWidth: 760 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Tu apuesta</h3>
          <div className="bet-grid">
            {OUTSIDE_BETS.map((b) => (
              <button
                key={b.type}
                className={betType === b.type ? 'btn' : 'btn secondary'}
                style={{ marginTop: 0 }}
                onClick={() => setBetType(b.type)}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              className={betType === 'straight' ? 'btn' : 'btn secondary'}
              style={{ marginTop: 0 }}
              onClick={() => setBetType('straight')}
            >
              Pleno (un número) · paga 35×
            </button>
            {betType === 'straight' && (
              <>
                <label>Número (0–36)</label>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={straight}
                  onChange={(e) =>
                    setStraight(Math.max(0, Math.min(36, Number(e.target.value))))
                  }
                />
              </>
            )}
          </div>

          <button className="btn" onClick={spin} disabled={busy}>
            {busy ? 'Girando…' : 'Girar gratis'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="panel" style={{ textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Resultado</h3>
          {result ? (
            <>
              <div className={`roulette-result ${resultClass}`}>{result.result_number}</div>
              {result.won ? (
                <p className="ok">¡Ganaste! +{result.reward_aurelios} Aurelios.</p>
              ) : (
                <p className="muted">Esta vez no. Te quedan {result.spins_left} giros hoy.</p>
              )}
              <p className="muted">Saldo: ⟡ {result.balance} · Giros restantes: {result.spins_left}</p>
            </>
          ) : (
            <p className="muted">Coloca tu apuesta y gira.</p>
          )}
        </div>
      </div>
    </div>
  );
}
