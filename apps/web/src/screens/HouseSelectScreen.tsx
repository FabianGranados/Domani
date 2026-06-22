import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { chooseHouse, listHouses } from '../lib/api';
import type { House } from '../lib/types';

export function HouseSelectScreen() {
  const { refreshProfile } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHouses().then(setHouses).catch((e) => setError(String(e)));
  }, []);

  async function pick(code: string) {
    setBusy(code);
    setError(null);
    try {
      await chooseHouse(code);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo elegir la Casa');
      setBusy(null);
    }
  }

  return (
    <div className="center-wrap">
      <div style={{ maxWidth: 980, width: '100%' }}>
        <h1 className="page-title" style={{ textAlign: 'center' }}>
          Elige tu Casa
        </h1>
        <p className="muted" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Una decisión define tu lugar en el Círculo. Podrás cambiarla más adelante.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="grid cols-3">
          {houses.map((h) => (
            <div
              key={h.id}
              className="house-card"
              style={{ ['--accent' as string]: h.color_primary ?? '#c9a227' }}
              onClick={() => !busy && pick(h.code)}
            >
              <span className="city">{h.city}</span>
              <h3>{h.name}</h3>
              <p className="motto">“{h.motto}”</p>
              <span className="pill">{h.specialty}</span>
              <button className="btn" disabled={busy === h.code} style={{ marginTop: '1rem' }}>
                {busy === h.code ? 'Entrando…' : 'Unirme'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
