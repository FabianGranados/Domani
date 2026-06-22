import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { claimRenta, getWallet, listHouses } from '../lib/api';
import type { House } from '../lib/types';

const RANK_LABELS: Record<string, string> = {
  ciudadano_nuevo: 'Ciudadano Nuevo',
  ciudadano_activo: 'Ciudadano Activo',
  ciudadano_reconocido: 'Ciudadano Reconocido',
  ciudadano_patricio: 'Ciudadano Patricio',
  consigliere: 'Consigliere',
  don: 'Don',
};

export function TesseraScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const [house, setHouse] = useState<House | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [rentaMsg, setRentaMsg] = useState<string | null>(null);
  const [rentaErr, setRentaErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => setHouse(hs.find((h) => h.id === profile?.house_id) ?? null));
  }, [user, profile?.house_id]);

  async function reclamar() {
    setBusy(true);
    setRentaErr(null);
    setRentaMsg(null);
    try {
      const r = await claimRenta('visita_tessera');
      setBalance(r.balance);
      setRentaMsg(`+${r.amount} Aurelios de Renta Ciudadana reclamados hoy.`);
      await refreshProfile();
    } catch (err) {
      setRentaErr(err instanceof Error ? err.message : 'No se pudo reclamar');
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <div>
      <h1 className="page-title">Tu Tessera</h1>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div
          className="tessera"
          style={{ borderColor: house?.color_primary ?? 'var(--gold)' }}
        >
          <div className="row">
            <span className="muted">Miembro</span>
            <strong>{profile.alias}</strong>
          </div>
          <div className="row">
            <span className="muted">Casa</span>
            <span>{house ? `${house.name} · ${house.city}` : '—'}</span>
          </div>
          <div className="row">
            <span className="muted">Rango</span>
            <span>{RANK_LABELS[profile.rank] ?? profile.rank}</span>
          </div>
          <div className="row">
            <span className="muted">Influencia</span>
            <span>{profile.influence}</span>
          </div>
          <div className="row">
            <span className="muted">Aurelios</span>
            <span className="aurelios">⟡ {balance ?? '—'}</span>
          </div>
          <div className="row">
            <span className="muted">Membresía</span>
            <span className="pill">{profile.membership}</span>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Renta Ciudadana</h3>
          <p className="muted">
            Cada día puedes reclamar tu asignación de Aurelios. Una vez por día.
          </p>
          <button className="btn" onClick={reclamar} disabled={busy}>
            {busy ? 'Reclamando…' : 'Reclamar Renta de hoy'}
          </button>
          {rentaMsg && <p className="ok">{rentaMsg}</p>}
          {rentaErr && <p className="error">{rentaErr}</p>}
        </div>
      </div>
    </div>
  );
}
