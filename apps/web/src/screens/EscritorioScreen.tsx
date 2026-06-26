import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  getWallet,
  listHouses,
  getActiveLoan,
  getLedger,
  claimRenta,
  getRentaClaimedToday,
  getMillonToday,
  type Loan,
  type MillonToday,
} from '../lib/api';
import type { House } from '../lib/types';
import { PremiumCards } from '../components/PremiumCards';
import { Carousel } from '../components/Carousel';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

// Imagen de respaldo de la Casa del usuario.
const HOUSE_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.webp',
  empire: '/assets/casa-empire.webp',
  plata: '/assets/casa-plata.webp',
  morro: '/assets/casa-morro.webp',
  roma: '/assets/casa-roma.webp',
  osaka: '/assets/casa-osaka.webp',
  aztlan: '/assets/casa-aztlan.webp',
};

const RANK_LABELS: Record<string, string> = {
  ciudadano_nuevo: 'Ciudadano Nuevo',
  ciudadano_activo: 'Ciudadano Activo',
  ciudadano_reconocido: 'Ciudadano Reconocido',
  ciudadano_patricio: 'Patricio',
  consigliere: 'Consigliere',
  don: 'Don',
};
// Hitos de Influencia (solo para la barra de progreso visual).
const INFLUENCE_MILESTONES = [50, 150, 400, 1000, 2500];

// Fotos del hero (cinematográfico, con crossfade + Ken Burns).
const HERO_IMAGES = [
  '/assets/hero-1.webp',
  '/assets/hero-2.webp',
  '/assets/hero-3.webp',
  '/assets/hero-4.webp',
];
// Palabra rotativa del titular (texto animado dinámico).
const HERO_WORDS = ['Donde el lujo es ley', 'El juego te espera', 'Construye tu poder', 'El Círculo observa'];

// Hubs principales (banners con arte propio). Enlace provisional: la 3ra
// imagen es de Mercadoliebre; por ahora la mandamos a Domanibank.
const HUBS = [
  { key: 'casinos', img: '/assets/hub-casinos.webp', to: '/casino' },
  { key: 'millon', img: '/assets/hub-millonaurelios.webp', to: '/millonaurelios' },
  { key: 'mercado', img: '/assets/hub-mercado.webp', to: '/banco' },
];

function greeting(): string {
  const h = typeof window !== 'undefined' ? new Date().getHours() : 20;
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function useIsDesktop(): boolean {
  const query = '(min-width: 820px)';
  const [v, setV] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : true));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const on = () => setV(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return v;
}

export function EscritorioScreen() {
  const { profile, user } = useAuth();
  const isDesktop = useIsDesktop();

  const [balance, setBalance] = useState<number | null>(null);
  const [todayDelta, setTodayDelta] = useState(0);
  const [houses, setHouses] = useState<House[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [rentaClaimed, setRentaClaimed] = useState<boolean | null>(null);
  const [millon, setMillon] = useState<MillonToday | null>(null);
  const [rentaBusy, setRentaBusy] = useState(false);

  // Rotación cinematográfica del hero (fotos cada 5s, palabra cada 3.2s).
  const [photoIdx, setPhotoIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const a = setInterval(() => setPhotoIdx((i) => (i + 1) % HERO_IMAGES.length), 5000);
    const b = setInterval(() => setWordIdx((i) => (i + 1) % HERO_WORDS.length), 3200);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const [w, hs, ln, claimed, mt, led] = await Promise.all([
      getWallet(user.id),
      listHouses(),
      getActiveLoan(user.id).catch(() => null),
      getRentaClaimedToday(user.id).catch(() => false),
      getMillonToday(user.id).catch(() => null),
      getLedger(user.id, 50).catch(() => []),
    ]);
    setBalance(w?.balance ?? 0);
    setHouses(hs);
    setLoan(ln);
    setRentaClaimed(claimed);
    setMillon(mt);
    const today = new Date().toISOString().slice(0, 10);
    setTodayDelta(led.filter((tx) => tx.created_at.slice(0, 10) === today).reduce((s, tx) => s + tx.amount, 0));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function onClaimRenta() {
    if (rentaBusy || rentaClaimed) return;
    setRentaBusy(true);
    try {
      const r = await claimRenta();
      setBalance(r.balance);
      setRentaClaimed(true);
      setTodayDelta((d) => d + r.amount);
    } catch {
      setRentaClaimed(true); // ya estaba reclamada
    } finally {
      setRentaBusy(false);
    }
  }

  const myHouse = useMemo(
    () => houses.find((h) => h.id === profile?.house_id) ?? null,
    [houses, profile?.house_id]
  );
  const houseName = myHouse ? myHouse.name.replace(/^Casa /, '') : 'Sin Casa';
  const houseColor = myHouse?.color_primary ?? '#c9a35b';
  const myHouseImg = myHouse ? HOUSE_IMG[myHouse.code] ?? '/assets/casa-bacata.webp' : '/assets/casa-bacata.webp';

  const alias = profile?.alias ?? 'Ciudadano';
  const initial = alias.trim().charAt(0).toUpperCase() || 'D';
  const influence = profile?.influence ?? 0;
  const rankLabel = RANK_LABELS[profile?.rank ?? ''] ?? 'Ciudadano';

  // Progreso de Influencia hacia el próximo hito (visual).
  const nextMs = INFLUENCE_MILESTONES.find((m) => m > influence) ?? null;
  const prevMs = [...INFLUENCE_MILESTONES].reverse().find((m) => m <= influence) ?? 0;
  const progress = nextMs ? Math.min(1, (influence - prevMs) / (nextMs - prevMs)) : 1;

  const millonPlayed = millon && millon.status !== 'in_progress';

  return (
    <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      {/* ════════ ZONA 1 · HERO CINEMATOGRÁFICO ════════ */}
      <header style={heroCard(isDesktop)}>
        {/* capas de foto: crossfade + Ken Burns */}
        {HERO_IMAGES.map((src, i) => (
          <div key={src} style={heroPhoto(src, i === photoIdx, i)} />
        ))}
        <div style={heroScrim} />

        <div style={heroContent(isDesktop)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <div style={avatarRing(houseColor)}>
              <div style={avatarInner}>{initial}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={eyebrow}>{greeting()}</div>
              <h1 className="page-title" style={{ margin: '2px 0 3px', fontSize: isDesktop ? 36 : 29 }}>
                Yo <span style={shimmerName}>{alias}</span>
              </h1>
              {/* titular rotativo animado */}
              <div style={taglineWrap}>
                <span key={wordIdx} style={taglineWord}>{HERO_WORDS[wordIdx]}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0 9px' }}>
                <span style={rankChip}>{rankLabel}</span>
                <span style={{ ...houseChip, borderColor: `${houseColor}66` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: houseColor, display: 'inline-block' }} />
                  {houseName}
                </span>
              </div>
              <div style={{ maxWidth: 320 }}>
                <div style={inflTrack}>
                  <div style={{ ...inflFill, width: `${progress * 100}%` }} />
                </div>
                <div style={inflLabel}>
                  Influencia <strong style={{ color: '#ece6d6' }}>{influence}</strong>
                  {nextMs ? <span style={{ color: 'rgba(232,226,212,.45)' }}> → {nextMs}</span> : <span style={{ color: '#ecd9a5' }}> · cúspide</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Billetera (panel de vidrio sobre la foto) */}
          <div style={walletBlock(isDesktop)}>
            <div style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(232,226,212,.6)' }}>Billetera</div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: isDesktop ? 34 : 30, color: '#ecd9a5', lineHeight: 1.05 }}>
              ⟡ {balance != null ? fmt(balance) : '—'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              {todayDelta !== 0 && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: todayDelta > 0 ? '#7ee0a6' : '#ff8a8a' }}>
                  {todayDelta > 0 ? '▲' : '▼'} hoy {todayDelta > 0 ? '+' : ''}{fmt(todayDelta)}
                </span>
              )}
              {loan && (
                <Link to="/banco" style={debtPill}>Debes ⟡ {fmt(loan.outstanding)}</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════ ZONA 2 · TU TESSERA (tarjetas premium) ════════ */}
      <SectionTitle title="Tu Tessera" hint="Tu identidad Domani" />
      <PremiumCards
        alias={alias}
        houses={houses}
        houseId={profile?.house_id ?? null}
        rank={profile?.rank ?? 'ciudadano_nuevo'}
        influence={influence}
        balance={balance ?? 0}
        onReclamar={onClaimRenta}
        rentaBusy={rentaBusy}
        rentaDone={rentaClaimed === true}
      />

      {/* ════════ ZONA 3 · HOY EN DOMANI (hubs con foto) ════════ */}
      <SectionTitle title="Hoy en Domani" hint="Entra a tu Domani" />
      <Carousel>
        {HUBS.map((h) => (
          <Link key={h.key} to={h.to} style={{ textDecoration: 'none', scrollSnapAlign: 'start' }}>
            <div style={hubCard(h.img)}>
              <div style={hubSheen} />
            </div>
          </Link>
        ))}
      </Carousel>

      {/* ════════ ZONA 4 · TUS APPS ════════ */}
      <SectionTitle title="Tus apps" hint="Todo a un toque" />
      <div style={appsGrid}>
        <AppTile
          to="/casino"
          img="/assets/casino-mesa.webp"
          label="Jugar"
          title="Sala de Juegos"
          value="Texas Hold'em y más"
          valueColor="rgba(232,226,212,.72)"
        />
        <AppTile
          to="/banco"
          img="/assets/emblema-aurelio.webp"
          label="Banco"
          title="Domanibank"
          value={loan ? `Debes ⟡ ${fmt(loan.outstanding)}` : `⟡ ${balance != null ? fmt(balance) : '—'}`}
          valueColor={loan ? '#ff9a9a' : '#7ee0a6'}
        />
        <AppTile
          to="/millonaurelios"
          img="/assets/bar-vip.webp"
          label="Concurso"
          title="Millonaurelios"
          value={millonPlayed ? 'Jugado hoy' : 'Disponible hoy'}
          valueColor={millonPlayed ? 'rgba(232,226,212,.6)' : '#7ee0a6'}
        />
      </div>

      {/* ════════ ZONA 4 · TU MUNDO ════════ */}
      <SectionTitle title="Tu mundo" hint="Tu identidad y tus bienes" />
      <div style={worldGrid}>
        <SmallTile to="/casas" img={myHouseImg} title="Tu Casa" sub={houseName} />
        <SmallTile img="/assets/lobby-domani.webp" title="Propiedades" sub="Próximamente" locked />
        <SmallTile img="/assets/via-mercado.webp" title="Mercadoliebre" sub="Próximamente" locked />
      </div>

      {/* ════════ ZONA 5 · EL CÍRCULO ════════ */}
      <div style={circuloBar}>
        <div style={circuloShine} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#d8b96b', letterSpacing: '.04em' }}>El Círculo</div>
            <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.45)' }}>Los que mueven los hilos. Nadie entra por ahora.</div>
          </div>
        </div>
        <span style={circuloPill}>Acceso restringido</span>
      </div>
    </div>
  );
}

// ════════ Subcomponentes ════════
function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 12px' }}>
      <h2 style={sectionTitle}>{title}</h2>
      <span className="muted" style={{ fontSize: 12.5 }}>{hint}</span>
    </div>
  );
}

function AppTile({
  to, img, label, title, value, valueColor, badge,
}: {
  to: string; img: string; label: string; title: string; value: string; valueColor: string; badge?: string;
}) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={appTile}>
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <div style={{ ...appThumb, backgroundImage: `url('${img}')` }} />
          {badge && <span style={tileBadge}>{badge}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={tileLabel}>{label}</div>
          <div style={tileTitle}>{title}</div>
          <div style={{ ...tileValue, color: valueColor }}>{value}</div>
        </div>
        <span style={tileArrow}>›</span>
      </div>
    </Link>
  );
}

function SmallTile({
  to, img, title, sub, locked,
}: {
  to?: string; img: string; title: string; sub: string; locked?: boolean;
}) {
  const inner = (
    <div style={smallTile(!!locked)}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: locked ? 'saturate(.5) brightness(.8)' : 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.1), rgba(8,8,10,.55) 55%, rgba(8,8,10,.94))' }} />
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: 12 }}>
        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#f3eddd' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: locked ? 'rgba(232,226,212,.5)' : '#d8b96b' }}>{sub}</div>
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : <div>{inner}</div>;
}

// ════════ estilos ════════
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' };

// Alto del hero: generoso para que las fotos 16:9 luzcan sin comerse las caras.
function heroCard(isDesktop: boolean): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', isolation: 'isolate',
    minHeight: isDesktop ? 'clamp(440px, 52vh, 560px)' : 'clamp(420px, 64vh, 520px)',
    marginTop: 'env(safe-area-inset-top)',
    borderRadius: 20, border: '1px solid rgba(201,163,91,.28)',
    background: '#0f0c16', boxShadow: '0 26px 60px -30px rgba(0,0,0,.95)',
  };
}
function heroPhoto(src: string, active: boolean, i: number): React.CSSProperties {
  return {
    position: 'absolute', inset: 0, backgroundImage: `url('${src}')`,
    backgroundSize: 'cover', backgroundPosition: 'center 38%',
    opacity: active ? 1 : 0, transition: 'opacity 1.5s ease',
    animation: `domKen 18s ease-in-out ${i * -4.5}s infinite alternate`,
  };
}
// Oscurece sobre todo abajo (donde va el texto); arriba casi transparente
// para no tapar las caras.
const heroScrim: React.CSSProperties = {
  position: 'absolute', inset: 0,
  backgroundImage:
    'linear-gradient(180deg, rgba(7,6,11,.18) 0%, rgba(7,6,11,.08) 32%, rgba(7,6,11,.55) 70%, rgba(7,6,11,.93) 100%), radial-gradient(120% 70% at 82% 4%, rgba(201,163,91,.14), transparent 50%)',
};
// Contenido anclado ABAJO: las caras de arriba quedan despejadas.
function heroContent(isDesktop: boolean): React.CSSProperties {
  return {
    position: 'relative', zIndex: 1, minHeight: isDesktop ? 'clamp(440px, 52vh, 560px)' : 'clamp(420px, 64vh, 520px)',
    display: 'flex', flexDirection: isDesktop ? 'row' : 'column',
    alignItems: isDesktop ? 'flex-end' : 'stretch', justifyContent: isDesktop ? 'space-between' : 'flex-end',
    gap: 18, padding: isDesktop ? '26px 28px' : '22px 18px',
  };
}
const shimmerName: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg,#c9a35b,#ecd9a5,#fff7e2,#ecd9a5,#c9a35b)',
  backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
  color: 'transparent', WebkitTextFillColor: 'transparent', animation: 'domShine 4s linear infinite',
};
const taglineWrap: React.CSSProperties = { height: 24, overflow: 'hidden' };
const taglineWord: React.CSSProperties = {
  display: 'inline-block', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic',
  fontSize: 18, color: '#e7d6a8', letterSpacing: '.02em', animation: 'domWordIn .6s ease-out',
};
function avatarRing(color: string): React.CSSProperties {
  return { flex: '0 0 auto', width: 66, height: 66, borderRadius: '50%', padding: 3, background: `linear-gradient(135deg, ${color}, ${color}88)`, boxShadow: `0 8px 24px -10px ${color}` };
}
const avatarInner: React.CSSProperties = {
  width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(160deg,#211b2e,#14111c)',
  display: 'grid', placeContent: 'center', fontFamily: 'Marcellus, serif', fontSize: 27, color: '#ecd9a5',
};
const rankChip: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.06em', padding: '4px 10px', borderRadius: 999,
  background: GOLD_GRAD, color: '#2c2415',
};
const houseChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ece6d6',
  padding: '4px 11px', borderRadius: 999, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(255,255,255,.02)',
};
const inflTrack: React.CSSProperties = { height: 6, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' };
const inflFill: React.CSSProperties = { height: '100%', borderRadius: 999, background: GOLD_GRAD };
const inflLabel: React.CSSProperties = { fontSize: 11.5, color: 'rgba(232,226,212,.7)', marginTop: 5 };

function walletBlock(isDesktop: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto', minWidth: isDesktop ? 200 : 'auto',
    alignSelf: isDesktop ? 'auto' : 'stretch', textAlign: isDesktop ? 'right' : 'left',
    display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'flex-end' : 'flex-start',
    padding: '12px 16px', borderRadius: 14,
    background: 'rgba(10,8,14,.5)', border: '1px solid rgba(201,163,91,.3)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 10px 30px -16px rgba(0,0,0,.8)',
  };
}
const debtPill: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#ffb3b3', textDecoration: 'none',
  padding: '4px 11px', borderRadius: 999, border: '1px solid rgba(255,138,138,.4)', background: 'rgba(255,138,138,.1)',
};

const sectionTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 27, margin: 0, color: '#ece6d6' };

// Banner-hub (arte propio con texto integrado): mostramos la imagen
// completa como tarjeta clickeable, con marco dorado y brillo tipo Tessera.
function hubCard(img: string): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', flex: '0 0 auto',
    width: 'clamp(280px, 86vw, 440px)', scrollSnapAlign: 'start', aspectRatio: '16 / 10',
    borderRadius: 16, border: '1px solid rgba(201,163,91,.4)',
    backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center',
    backgroundColor: '#14111c', boxShadow: '0 22px 50px -22px rgba(0,0,0,.85)',
  };
}
const hubSheen: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)',
  transform: 'skewX(-16deg)', animation: 'domShimmer 7s ease-in-out infinite', pointerEvents: 'none',
};

const appsGrid: React.CSSProperties = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' };
const appTile: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 13, padding: 12, borderRadius: 16,
  border: '1px solid rgba(201,163,91,.2)', background: 'linear-gradient(160deg,#181423,#110f18)',
  boxShadow: '0 14px 34px -24px rgba(0,0,0,.85)', cursor: 'pointer',
};
const appThumb: React.CSSProperties = {
  width: 60, height: 60, borderRadius: 13, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c',
  border: '1px solid rgba(201,163,91,.25)',
};
const tileBadge: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
  background: GOLD_GRAD, color: '#2c2415', fontSize: 12, fontWeight: 800, display: 'grid', placeContent: 'center',
  boxShadow: '0 3px 10px -3px rgba(0,0,0,.7)',
};
const tileLabel: React.CSSProperties = { fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e' };
const tileTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 19, color: '#f3eddd', margin: '1px 0 2px' };
const tileValue: React.CSSProperties = { fontSize: 13, fontWeight: 600 };
const tileArrow: React.CSSProperties = { flex: '0 0 auto', fontSize: 24, color: 'rgba(201,163,91,.5)', paddingRight: 4 };

const worldGrid: React.CSSProperties = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' };
function smallTile(locked: boolean): React.CSSProperties {
  return {
    position: 'relative', display: 'flex', aspectRatio: '16 / 11', borderRadius: 14, overflow: 'hidden',
    border: locked ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(201,163,91,.22)',
    boxShadow: '0 12px 30px -22px rgba(0,0,0,.85)', cursor: locked ? 'default' : 'pointer',
  };
}

const circuloBar: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, marginTop: 26, padding: '16px 18px', borderRadius: 16,
  border: '1px solid rgba(201,163,91,.25)', background: 'linear-gradient(120deg,#0c0a12,#15121d 50%,#0c0a12)',
};
const circuloShine: React.CSSProperties = {
  position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(201,163,91,.08) 50%, transparent 60%)',
};
const circuloPill: React.CSSProperties = {
  flex: '0 0 auto', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
  color: 'rgba(236,230,214,.7)', padding: '6px 12px', borderRadius: 999,
  border: '1px solid rgba(201,163,91,.3)', background: 'rgba(8,8,10,.4)',
};
