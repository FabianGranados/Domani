import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, listHouses } from '../lib/api';
import type { House } from '../lib/types';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

// Imagen de respaldo si la Casa del usuario no resuelve.
const HOUSE_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.webp',
  empire: '/assets/casa-empire.webp',
  plata: '/assets/casa-plata.webp',
  morro: '/assets/casa-morro.webp',
  roma: '/assets/casa-roma.webp',
  osaka: '/assets/casa-osaka.webp',
  aztlan: '/assets/casa-aztlan.webp',
};

type AppCard = {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  img: string;
  to: string | null;
  locked?: boolean;
  lockedText?: string;
  mysterious?: boolean;
  badge?: string; // p.ej. recuento de no leídos
};

function greeting(): string {
  // Saludo según la hora local del dispositivo (guardado por si no hay window).
  const h = typeof window !== 'undefined' ? new Date().getHours() : 20;
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function EscritorioScreen() {
  const { profile, user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [houses, setHouses] = useState<House[]>([]);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then(setHouses);
  }, [user]);

  const myHouse = useMemo(
    () => houses.find((h) => h.id === profile?.house_id) ?? null,
    [houses, profile?.house_id]
  );
  const houseName = myHouse ? myHouse.name.replace(/^Casa /, '') : 'Sin Casa';
  const houseCity = myHouse?.city ?? '';
  const myHouseImg = myHouse ? HOUSE_IMG[myHouse.code] ?? '/assets/casa-bacata.webp' : '/assets/casa-bacata.webp';

  const alias = profile?.alias ?? 'Ciudadano';
  const initial = alias.trim().charAt(0).toUpperCase() || 'D';

  const cards: AppCard[] = [
    {
      key: 'michat',
      label: 'Mensajería',
      title: 'Michat',
      subtitle: 'Tus mensajes y avisos',
      img: '/assets/consigliere.webp',
      to: '/michat',
      badge: '3',
    },
    {
      key: 'casino',
      label: 'Jugar',
      title: 'Sala de Juegos',
      subtitle: "Texas Hold'em y más",
      img: '/assets/casino-mesa.webp',
      to: '/casino',
    },
    {
      key: 'banco',
      label: 'Banco',
      title: 'Domanibank',
      subtitle: `⟡ ${balance != null ? balance.toLocaleString() : '—'}`,
      img: '/assets/emblema-aurelio.webp',
      to: '/banco',
    },
    {
      key: 'casa',
      label: 'Tu bandera',
      title: 'Tu Casa',
      subtitle: houseCity ? `${houseName} · ${houseCity}` : houseName,
      img: myHouseImg,
      to: '/casas',
    },
    {
      key: 'mercado',
      label: 'Mercado',
      title: 'Mercadoliebre',
      subtitle: 'Próximamente',
      img: '/assets/via-mercado.webp',
      to: null,
      locked: true,
      lockedText: 'Próximamente',
    },
    {
      key: 'millon',
      label: 'Concurso',
      title: 'Millonaurelios',
      subtitle: 'Trivia · premio diario',
      img: '/assets/bar-vip.webp',
      to: '/millonaurelios',
    },
    {
      key: 'circulo',
      label: 'El Círculo',
      title: 'El Círculo',
      subtitle: 'Acceso restringido',
      img: '/assets/bar-vip.webp',
      to: null,
      locked: true,
      lockedText: 'Acceso restringido',
      mysterious: true,
    },
    {
      key: 'propiedades',
      label: 'Bienes',
      title: 'Propiedades',
      subtitle: 'Próximamente',
      img: '/assets/lobby-domani.webp',
      to: null,
      locked: true,
      lockedText: 'Próximamente',
    },
  ];

  return (
    <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* ===== Cabecera — "quién soy" ===== */}
      <header style={headerWrap}>
        <div style={avatarRing}>
          <div style={avatarInner}>{initial}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrow}>{greeting()}</div>
          <h1 className="page-title" style={{ margin: '4px 0 0' }}>
            Yo <span style={{ color: '#ecd9a5' }}>{alias}</span>
          </h1>
          <div style={vitalsRow}>
            <span style={vitalPill} title="Aurelios (moneda de fantasía)">
              <span style={{ color: '#e3c75a' }}>⟡</span> {balance != null ? balance.toLocaleString() : '—'}
            </span>
            <span style={vitalSep} aria-hidden>·</span>
            <span style={vitalPlain}>
              Influencia <strong style={{ color: '#ece6d6' }}>{profile?.influence ?? 0}</strong>
            </span>
            <span style={vitalSep} aria-hidden>·</span>
            <span style={vitalPlain}>
              Casa <strong style={{ color: '#ece6d6' }}>{houseName}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* ===== El Escritorio — rejilla de apps ===== */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2rem 0 1rem' }}>
        <h2 style={sectionTitle}>El Escritorio</h2>
        <span className="muted" style={{ fontSize: 13 }}>Tu Domani, en una pantalla</span>
      </div>

      <div style={gridStyle}>
        {cards.map((c) => {
          const card = (
            <div style={appCard(!!c.locked, !!c.mysterious)}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url('${c.img}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#14111c',
                  filter: c.locked ? 'saturate(.55) brightness(.85)' : 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: c.mysterious
                    ? 'linear-gradient(180deg, rgba(8,8,10,.45), rgba(8,8,10,.78) 50%, rgba(8,8,10,.98))'
                    : 'linear-gradient(180deg, rgba(8,8,10,.08), rgba(8,8,10,.5) 50%, rgba(8,8,10,.96))',
                }}
              />
              {c.badge && !c.locked && <span style={unreadBadge}>{c.badge}</span>}

              <div style={cardContent}>
                <div style={cardLabel}>{c.label}</div>
                <div style={cardTitle}>{c.title}</div>
                <div style={cardSubtitle}>{c.subtitle}</div>
                {c.locked ? (
                  <span style={lockedPill}>{c.lockedText}</span>
                ) : (
                  <span style={enterBtn}>Entrar</span>
                )}
              </div>
            </div>
          );
          return c.to ? (
            <Link key={c.key} to={c.to} style={{ textDecoration: 'none' }}>
              {card}
            </Link>
          ) : (
            <div key={c.key}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

// ---- estilos ----
const headerWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  paddingTop: 'env(safe-area-inset-top)',
};
const avatarRing: React.CSSProperties = {
  flex: '0 0 auto',
  width: 64,
  height: 64,
  borderRadius: '50%',
  padding: 3,
  background: 'linear-gradient(135deg, #1f6f4a, #2da06b)',
  boxShadow: '0 8px 24px -10px rgba(45,160,107,.7)',
};
const avatarInner: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: 'linear-gradient(160deg,#211b2e,#14111c)',
  display: 'grid',
  placeContent: 'center',
  fontFamily: 'Marcellus, serif',
  fontSize: 26,
  color: '#ecd9a5',
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.34em',
  textTransform: 'uppercase',
  color: '#9c7a3e',
};
const vitalsRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 10,
};
const vitalPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 12px',
  borderRadius: 999,
  border: '1px solid rgba(201,163,91,.4)',
  background: 'rgba(201,163,91,.08)',
  color: '#ece6d6',
  fontSize: 14,
  fontWeight: 700,
};
const vitalPlain: React.CSSProperties = { fontSize: 14, color: 'rgba(232,226,212,.75)' };
const vitalSep: React.CSSProperties = { color: 'rgba(232,226,212,.3)' };

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond',serif",
  fontSize: 30,
  margin: 0,
  color: '#ece6d6',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
};

function appCard(locked: boolean, mysterious: boolean): React.CSSProperties {
  return {
    position: 'relative',
    aspectRatio: '4 / 5',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    border: mysterious
      ? '1px solid rgba(201,163,91,.5)'
      : locked
        ? '1px solid rgba(255,255,255,.06)'
        : '1px solid rgba(201,163,91,.22)',
    boxShadow: '0 16px 40px -24px rgba(0,0,0,.85)',
    cursor: locked ? 'default' : 'pointer',
  };
}
const cardContent: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  marginTop: 'auto',
  padding: 16,
  width: '100%',
};
const cardLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  color: '#d8b96b',
};
const cardTitle: React.CSSProperties = {
  fontFamily: 'Marcellus,serif',
  fontSize: 21,
  color: '#f3eddd',
  margin: '3px 0 2px',
};
const cardSubtitle: React.CSSProperties = {
  fontSize: 12.5,
  color: 'rgba(232,226,212,.72)',
  marginBottom: 12,
  lineHeight: 1.35,
};
const enterBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 18px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  background: GOLD_GRAD,
  color: '#2c2415',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const lockedPill: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: 11,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'rgba(236,230,214,.8)',
  border: '1px solid rgba(201,163,91,.35)',
  background: 'rgba(8,8,10,.45)',
};
const unreadBadge: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 2,
  minWidth: 24,
  height: 24,
  padding: '0 7px',
  borderRadius: 999,
  background: GOLD_GRAD,
  color: '#2c2415',
  fontSize: 13,
  fontWeight: 800,
  display: 'grid',
  placeContent: 'center',
  boxShadow: '0 4px 12px -4px rgba(0,0,0,.6)',
};
