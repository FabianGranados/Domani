import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { chooseHouse, claimRenta, getWallet, listHouses } from '../lib/api';
import type { House } from '../lib/types';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

// Orden visual y mapa de imágenes de cada Casa
const HOUSE_ORDER = ['bacata', 'empire', 'plata', 'morro', 'roma', 'osaka', 'aztlan'];
const HOUSE_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.png',
  empire: '/assets/casa-empire.png',
  plata: '/assets/casa-plata.png',
  morro: '/assets/casa-morro.png',
  roma: '/assets/casa-roma.png',
  osaka: '/assets/casa-osaka.png',
  aztlan: '/assets/casa-aztlan.png',
};

// Salas (actividades). Las "ready:false" se irán construyendo aparte.
const SALAS = [
  { key: 'casino', title: 'El Casino', img: '/assets/via-casino.png', desc: 'Texas Hold’em, Ruleta y Blackjack.', to: '/ruleta', ready: true },
  { key: 'academia', title: 'La Academia', img: '/assets/via-academia.png', desc: 'Concurso de cultura general.', to: '/academia', ready: true },
  { key: 'destreza', title: 'Destreza', img: '/assets/via-destreza.png', desc: 'Ajedrez, damas y dominó.', to: null, ready: false },
  { key: 'mercado', title: 'El Mercado', img: '/assets/via-mercado.png', desc: 'Compra casa, taxi, bus o invierte en oro.', to: null, ready: false },
];

export function SalonScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [rentaMsg, setRentaMsg] = useState<string | null>(null);
  const [rentaErr, setRentaErr] = useState<string | null>(null);
  const [rentaBusy, setRentaBusy] = useState(false);
  const [houseBusy, setHouseBusy] = useState<string | null>(null);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => {
      hs.sort((a, b) => HOUSE_ORDER.indexOf(a.code) - HOUSE_ORDER.indexOf(b.code));
      setHouses(hs);
    });
  }, [user]);

  // Desafío del día: rota de forma justa entre Casas (determinístico por fecha).
  const dayNum = Math.floor(Date.now() / 86_400_000);
  const challengeCode = HOUSE_ORDER[dayNum % HOUSE_ORDER.length];
  const challengeHouse = houses.find((h) => h.code === challengeCode);

  async function reclamar() {
    setRentaBusy(true);
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
      setRentaBusy(false);
    }
  }

  async function pickHouse(code: string) {
    setHouseBusy(code);
    try {
      await chooseHouse(code);
      await refreshProfile();
    } finally {
      setHouseBusy(null);
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
          gap: 18,
          flexWrap: 'wrap',
          borderColor: 'rgba(201,163,91,.4)',
          background: 'linear-gradient(135deg, rgba(201,163,91,.10), rgba(255,255,255,.02))',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px', fontFamily: "'Cormorant Garamond',serif", fontSize: 22 }}>Renta Ciudadana</h3>
          <p className="muted" style={{ margin: 0 }}>
            Tu asignación diaria de Aurelios. Saldo actual: <span className="aurelios">⟡ {balance ?? '—'}</span>
          </p>
          {rentaMsg && <p className="ok" style={{ marginBottom: 0 }}>{rentaMsg}</p>}
          {rentaErr && <p className="error" style={{ marginBottom: 0 }}>{rentaErr}</p>}
        </div>
        <button onClick={reclamar} disabled={rentaBusy} style={btnGold(rentaBusy)}>
          {rentaBusy ? 'Reclamando…' : 'Reclamar Renta'}
        </button>
      </div>

      {/* ====== SALAS (carrusel horizontal) ====== */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2.2rem 0 1rem' }}>
        <h2 style={sectionTitle}>Las Salas</h2>
        <span className="muted" style={{ fontSize: 13 }}>¿Dónde juegas esta noche? →</span>
      </div>
      <div style={carousel}>
        {SALAS.map((s) => {
          const card = (
            <div style={{ ...salaCard, opacity: s.ready ? 1 : 0.7 }}>
              <div style={{ ...salaImg, backgroundImage: `url('${s.img}')` }} />
              <div style={salaScrim} />
              {!s.ready && <span style={comingSoon}>Próximamente</span>}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, zIndex: 2 }}>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#f3eddd' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(232,226,212,.72)', marginTop: 4, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          );
          return s.ready && s.to ? (
            <Link key={s.key} to={s.to} style={{ textDecoration: 'none', scrollSnapAlign: 'start' }}>
              {card}
            </Link>
          ) : (
            <div key={s.key} style={{ scrollSnapAlign: 'start' }}>{card}</div>
          );
        })}
      </div>

      {/* ====== CASAS ====== */}
      <div style={{ margin: '2.6rem 0 0.6rem' }}>
        <h2 style={sectionTitle}>Las Casas</h2>
        <p className="muted" style={{ maxWidth: 640, marginTop: 6 }}>
          Tu Casa es tu bandera: eliges una y luchas por ella. Cada día, una Casa al azar recibe un
          <strong style={{ color: '#ecd9a5' }}> desafío</strong> que reparte Aurelios. Hoy no representas a nadie hasta que elijas.
        </p>
      </div>

      {/* Desafío del día */}
      {challengeHouse && (
        <div
          className="panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderColor: 'rgba(201,163,91,.45)',
            background: 'linear-gradient(135deg, rgba(201,163,91,.12), rgba(255,255,255,.02))',
            marginBottom: '1.2rem',
          }}
        >
          <img src={HOUSE_IMG[challengeHouse.code]} alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e' }}>Desafío del día</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#f3eddd' }}>
              Hoy le toca a <span style={{ color: '#ecd9a5' }}>{challengeHouse.name}</span>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Próximamente podrás jugarlo para sumar Aurelios a tu Casa.</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 16 }}>
        {houses.map((h) => {
          const isMine = profile?.house_id === h.id;
          return (
            <div
              key={h.id}
              style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                border: isMine ? '1px solid rgba(201,163,91,.8)' : '1px solid rgba(255,255,255,.08)',
                background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))',
                boxShadow: isMine ? '0 16px 40px -20px rgba(201,163,91,.5)' : '0 14px 34px -24px rgba(0,0,0,.8)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  aspectRatio: '1/1',
                  backgroundImage: `url('${HOUSE_IMG[h.code]}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#14111c',
                }}
              />
              <div style={{ padding: '14px 14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e' }}>{h.city}</div>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 19, color: '#f3eddd', margin: '2px 0 8px' }}>
                  {h.name.replace(/^Casa /, '')}
                </div>
                {isMine ? (
                  <div style={{ ...btnBase, background: 'rgba(201,163,91,.16)', color: '#ecd9a5', border: '1px solid rgba(201,163,91,.5)' }}>
                    ✓ Tu Casa
                  </div>
                ) : (
                  <button onClick={() => pickHouse(h.code)} disabled={!!houseBusy} style={{ ...btnBase, ...btnGoldStyle, opacity: houseBusy ? 0.6 : 1 }}>
                    {houseBusy === h.code ? 'Uniéndote…' : 'Luchar por ella'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- estilos ----
const sectionTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 30, margin: 0, color: '#ece6d6' };

const carousel: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  overflowX: 'auto',
  paddingBottom: 8,
  scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch',
};

const salaCard: React.CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  width: 270,
  height: 320,
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(201,163,91,.2)',
  boxShadow: '0 18px 40px -22px rgba(0,0,0,.8)',
};
const salaImg: React.CSSProperties = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c' };
const salaScrim: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,8,10,.92) 100%)' };
const comingSoon: React.CSSProperties = {
  position: 'absolute', top: 12, right: 12, zIndex: 3,
  fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
  color: '#1a1405', background: 'rgba(236,217,165,.9)', padding: '4px 9px', borderRadius: 999, fontWeight: 700,
};

const btnBase: React.CSSProperties = { display: 'block', width: '100%', padding: '10px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, textAlign: 'center', cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif" };
const btnGoldStyle: React.CSSProperties = { background: GOLD_GRAD, color: '#2c2415', border: 'none' };
function btnGold(busy: boolean): React.CSSProperties {
  return { padding: '13px 26px', borderRadius: 12, border: 'none', background: GOLD_GRAD, color: '#2c2415', fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' };
}
