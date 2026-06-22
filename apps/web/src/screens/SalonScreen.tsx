import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { claimRenta, getWallet } from '../lib/api';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

const DESTINOS = [
  { to: '/academia', eyebrow: 'El concurso', title: 'La Academia', desc: 'Responde y gana Aurelios e Influencia por mérito.' },
  { to: '/ruleta', eyebrow: 'Azar gratis', title: 'La Ruleta', desc: 'Giros gratuitos: si aciertas, la banca te regala Aurelios.' },
  { to: '/wallet', eyebrow: 'Tu billetera', title: 'Aurelios', desc: 'Mira tu saldo y el historial de cada movimiento.' },
  { to: '/lobby', eyebrow: 'La sociedad', title: 'El Círculo', desc: 'Mira el ranking de Influencia de todos los miembros.' },
];

export function SalonScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [rentaMsg, setRentaMsg] = useState<string | null>(null);
  const [rentaErr, setRentaErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
  }, [user]);

  async function reclamar() {
    setBusy(true);
    setRentaErr(null);
    setRentaMsg(null);
    try {
      const r = await claimRenta('visita_salon');
      setBalance(r.balance);
      setRentaMsg(`+${r.amount} Aurelios reclamados hoy.`);
      await refreshProfile();
    } catch (err) {
      setRentaErr(err instanceof Error ? err.message : 'No se pudo reclamar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>
        Bienvenido al salón
      </div>
      <h1 className="page-title" style={{ marginTop: 8 }}>
        Buenas noches, <span style={{ color: '#ecd9a5' }}>{profile?.alias}</span>.
      </h1>

      {/* Renta Ciudadana */}
      <div
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          borderColor: 'rgba(201,163,91,.4)',
          background: 'linear-gradient(135deg, rgba(201,163,91,.10), rgba(255,255,255,.02))',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px', fontFamily: "'Cormorant Garamond',serif", fontSize: 24 }}>
            Renta Ciudadana
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            Tu asignación diaria de Aurelios. Una vez por día. Saldo actual: ⟡ {balance ?? '—'}
          </p>
          {rentaMsg && <p className="ok" style={{ marginBottom: 0 }}>{rentaMsg}</p>}
          {rentaErr && <p className="error" style={{ marginBottom: 0 }}>{rentaErr}</p>}
        </div>
        <button
          onClick={reclamar}
          disabled={busy}
          style={{
            padding: '13px 28px',
            borderRadius: 12,
            border: 'none',
            background: GOLD_GRAD,
            color: '#2c2415',
            fontWeight: 700,
            fontSize: 15,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
            whiteSpace: 'nowrap',
            boxShadow: '0 14px 34px -12px rgba(201,163,91,.55)',
          }}
        >
          {busy ? 'Reclamando…' : 'Reclamar Renta'}
        </button>
      </div>

      {/* Destinos */}
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, margin: '2rem 0 1rem' }}>
        ¿A qué juegas esta noche?
      </h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {DESTINOS.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="panel"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'border-color .15s ease, transform .15s ease' }}
          >
            <div style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9c7a3e' }}>
              {d.eyebrow}
            </div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#f3eddd', margin: '6px 0 8px' }}>
              {d.title}
            </div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {d.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
