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
  type Loan,
} from '../lib/api';
import type { House } from '../lib/types';
import { PremiumCards } from '../components/PremiumCards';
import { Carousel } from '../components/Carousel';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

// Avatar provisional (uno solo, mientras construimos el selector).
const AVATAR_IMG = '/assets/avatar-1.webp';

const RANK_LABELS: Record<string, string> = {
  ciudadano_nuevo: 'Ciudadano Nuevo',
  ciudadano_activo: 'Ciudadano Activo',
  ciudadano_reconocido: 'Ciudadano Reconocido',
  ciudadano_patricio: 'Patricio',
  consigliere: 'Consigliere',
  don: 'Don',
};
const INFLUENCE_MILESTONES = [50, 150, 400, 1000, 2500];

// Fotos del hero (cinematográfico, con crossfade + Ken Burns).
const HERO_IMAGES = ['/assets/hero-1.webp', '/assets/hero-2.webp', '/assets/hero-3.webp', '/assets/hero-4.webp'];
const HERO_WORDS = ['Donde el lujo es ley', 'El juego te espera', 'Construye tu poder', 'El Círculo observa'];

// "Tus apps": banners con arte propio (texto/CTA integrados).
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
  const [rentaBusy, setRentaBusy] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  // Resumen financiero (de los últimos movimientos del ledger).
  const [finIn, setFinIn] = useState(0);
  const [finOut, setFinOut] = useState(0);
  const [finCount, setFinCount] = useState(0);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const a = setInterval(() => setPhotoIdx((i) => (i + 1) % HERO_IMAGES.length), 5000);
    const b = setInterval(() => setWordIdx((i) => (i + 1) % HERO_WORDS.length), 3200);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const [w, hs, ln, claimed, led] = await Promise.all([
      getWallet(user.id),
      listHouses(),
      getActiveLoan(user.id).catch(() => null),
      getRentaClaimedToday(user.id).catch(() => false),
      getLedger(user.id, 50).catch(() => []),
    ]);
    setBalance(w?.balance ?? 0);
    setHouses(hs);
    setLoan(ln);
    setRentaClaimed(claimed);
    const today = new Date().toISOString().slice(0, 10);
    setTodayDelta(led.filter((tx) => tx.created_at.slice(0, 10) === today).reduce((s, tx) => s + tx.amount, 0));
    setFinIn(led.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0));
    setFinOut(led.filter((tx) => tx.amount < 0).reduce((s, tx) => s - tx.amount, 0));
    setFinCount(led.length);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function onClaimRenta() {
    if (rentaBusy || rentaClaimed) return;
    setRentaBusy(true);
    try {
      const r = await claimRenta();
      setBalance(r.balance);
      setRentaClaimed(true);
      setTodayDelta((d) => d + r.amount);
    } catch {
      setRentaClaimed(true);
    } finally {
      setRentaBusy(false);
    }
  }

  const myHouse = useMemo(() => houses.find((h) => h.id === profile?.house_id) ?? null, [houses, profile?.house_id]);
  const houseName = myHouse ? myHouse.name.replace(/^Casa /, '') : 'Sin Casa';
  const houseColor = myHouse?.color_primary ?? '#c9a35b';

  const alias = profile?.alias ?? 'Ciudadano';
  const influence = profile?.influence ?? 0;
  const rankLabel = RANK_LABELS[profile?.rank ?? ''] ?? 'Ciudadano';

  const nextMs = INFLUENCE_MILESTONES.find((m) => m > influence) ?? null;
  const prevMs = [...INFLUENCE_MILESTONES].reverse().find((m) => m <= influence) ?? 0;
  const progress = nextMs ? Math.min(1, (influence - prevMs) / (nextMs - prevMs)) : 1;

  const finTotal = finIn + finOut;
  const inDeg = finTotal > 0 ? (finIn / finTotal) * 360 : 0;

  return (
    <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      {/* ════════ ZONA 1 · HERO CINEMATOGRÁFICO ════════ */}
      <header style={heroCard(isDesktop)}>
        {HERO_IMAGES.map((src, i) => (
          <div key={src} style={heroPhoto(src, i === photoIdx, i)} />
        ))}
        <div style={heroScrim} />

        <div style={heroContent(isDesktop)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <button onClick={() => setShowAvatar(true)} style={avatarRingBtn(houseColor)} aria-label="Gestionar tu avatar">
              <span style={avatarCircle}>
                <img src={AVATAR_IMG} alt="" style={avatarPortrait} />
              </span>
              <span style={avatarEditDot}>✎</span>
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={eyebrow}>{greeting()}</div>
              <h1 className="page-title" style={{ margin: '2px 0 3px', fontSize: isDesktop ? 36 : 29 }}>
                Yo <span style={shimmerName}>{alias}</span>
              </h1>
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
                <div style={inflTrack}><div style={{ ...inflFill, width: `${progress * 100}%` }} /></div>
                <div style={inflLabel}>
                  Influencia <strong style={{ color: '#ece6d6' }}>{influence}</strong>
                  {nextMs ? <span style={{ color: 'rgba(232,226,212,.45)' }}> → {nextMs}</span> : <span style={{ color: '#ecd9a5' }}> · cúspide</span>}
                </div>
              </div>
            </div>
          </div>

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
              {loan && <Link to="/banco" style={debtPill}>Debes ⟡ {fmt(loan.outstanding)}</Link>}
            </div>
          </div>
        </div>
      </header>

      {/* ════════ ZONA 2 · TU TESSERA ════════ */}
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

      {/* ════════ ZONA 3 · TUS APPS (banners) ════════ */}
      <SectionTitle title="Tus apps" hint="Entra a tu Domani" />
      <Carousel>
        {HUBS.map((h) => (
          <Link key={h.key} to={h.to} style={{ textDecoration: 'none', scrollSnapAlign: 'start' }}>
            <div style={hubCard(h.img)}><div style={hubSheen} /></div>
          </Link>
        ))}
      </Carousel>

      {/* ════════ ZONA 4 · ZONA FINANCIERA ════════ */}
      <SectionTitle title="Zona financiera" hint="Tu banco y tus movimientos" />
      <div style={finGrid}>
        {/* Domanibank */}
        <Link to="/banco" style={{ textDecoration: 'none' }}>
          <div style={{ ...photoTile, backgroundImage: `url('/assets/fin-bank.webp')` }}>
            <div style={tileScrim} />
            <div style={tileFoot}>
              <div style={tileEyebrow}>Banco</div>
              <div style={tileTitleGold}>Domanibank</div>
              <div style={tileSub}>⟡ {balance != null ? fmt(balance) : '—'} {loan ? `· Debes ⟡ ${fmt(loan.outstanding)}` : '· Entrar'}</div>
            </div>
          </div>
        </Link>

        {/* Movimientos financieros */}
        <Link to="/banco" style={{ textDecoration: 'none' }}>
          <div style={movTile}>
            <div style={tileEyebrow}>Tus movimientos</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <div style={donutWrap(inDeg)}>
                <div style={donutHole}>
                  <span style={{ fontSize: 10, color: 'rgba(232,226,212,.55)' }}>movs</span>
                  <span style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#ece6d6' }}>{finCount}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={legendRow}><span style={{ ...legendDot, background: '#3fe0a0' }} /> Ingresos<br /><b style={{ color: '#7ee0a6' }}>⟡ {fmt(finIn)}</b></div>
                <div style={legendRow}><span style={{ ...legendDot, background: '#c45464' }} /> Egresos<br /><b style={{ color: '#ff9a9a' }}>⟡ {fmt(finOut)}</b></div>
              </div>
            </div>
            <div style={tileSub}>Comprado, vendido y más en Domanibank →</div>
          </div>
        </Link>
      </div>

      {/* ════════ ZONA 5 · HOY EN DOMANI (próximamente) ════════ */}
      <SectionTitle title="Hoy en Domani" hint="Novedades del día" />
      <div style={placeholderBox}>
        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 18, color: '#ece6d6' }}>Pronto</div>
        <p className="muted" style={{ margin: '6px 0 0', maxWidth: 460 }}>
          Aquí llegarán las novedades, misiones y eventos del día en Domani.
        </p>
      </div>

      {/* ════════ ZONA 6 · EL CÍRCULO ════════ */}
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

      {/* ════════ Modal: gestionar avatar ════════ */}
      {showAvatar && (
        <div style={modalOverlay} onClick={() => setShowAvatar(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={modalClose} onClick={() => setShowAvatar(false)} aria-label="Cerrar">×</button>
            <div style={modalAvatar}>
              <img src={AVATAR_IMG} alt="" style={avatarPortrait} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={eyebrow}>Tu avatar</div>
              <h3 style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd', margin: '4px 0 2px' }}>{alias}</h3>
              <p className="muted" style={{ margin: '0 auto 16px', maxWidth: 300, fontSize: 13 }}>
                Tu primer avatar es <strong style={{ color: '#7ee0a6' }}>gratis</strong>. Para cambiarlo de nuevo, entra al
                Mercado de Avatares — se paga con Aurelios.
              </p>
              <button style={marketBtn} disabled>Mercado de Avatares · Próximamente</button>
            </div>
          </div>
        </div>
      )}
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

// ════════ estilos ════════
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' };

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
const heroScrim: React.CSSProperties = {
  position: 'absolute', inset: 0,
  backgroundImage:
    'linear-gradient(180deg, rgba(7,6,11,.18) 0%, rgba(7,6,11,.08) 32%, rgba(7,6,11,.55) 70%, rgba(7,6,11,.93) 100%), radial-gradient(120% 70% at 82% 4%, rgba(201,163,91,.14), transparent 50%)',
};
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
// Círculo del avatar en el hero (más grande, clickeable para gestionarlo).
const avatarRingBtn = (color: string): React.CSSProperties => ({
  position: 'relative', flex: '0 0 auto', width: 88, height: 88, borderRadius: '50%', padding: 3,
  border: 'none', cursor: 'pointer', display: 'block',
  background: `linear-gradient(135deg, ${color}, ${color}88)`, boxShadow: `0 10px 28px -10px ${color}`,
});
// Fondo plano DETRÁS del avatar (rellena la transparencia del PNG).
const avatarCircle: React.CSSProperties = {
  display: 'block', position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'radial-gradient(120% 100% at 50% 0%, #1e6f4a, #14111c 72%)',
};
const avatarPortrait: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
};
const avatarEditDot: React.CSSProperties = {
  position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
  background: GOLD_GRAD, color: '#2c2415', fontSize: 12, fontWeight: 700,
  display: 'grid', placeItems: 'center', border: '2px solid #14111c',
};
const rankChip: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.06em', padding: '4px 10px', borderRadius: 999,
  background: GOLD_GRAD, color: '#2c2415', alignSelf: 'flex-start',
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
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 10px 30px -16px rgba(0,0,0,.8)',
  };
}
const debtPill: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#ffb3b3', textDecoration: 'none',
  padding: '4px 11px', borderRadius: 999, border: '1px solid rgba(255,138,138,.4)', background: 'rgba(255,138,138,.1)',
};

const sectionTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 27, margin: 0, color: '#ece6d6' };

// Banners "Tus apps"
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

// Zona financiera
const finGrid: React.CSSProperties = { display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' };
const tileBase: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', aspectRatio: '4 / 5', borderRadius: 18,
  border: '1px solid rgba(201,163,91,.28)', boxShadow: '0 18px 44px -26px rgba(0,0,0,.9)', cursor: 'pointer',
};
const photoTile: React.CSSProperties = { ...tileBase, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c' };
const tileScrim: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.05) 40%, rgba(8,8,10,.6) 72%, rgba(8,8,10,.95) 100%)' };
const tileFoot: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, zIndex: 1 };
const tileEyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#d8b96b' };
const tileTitleGold: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 23, color: '#ecd9a5', margin: '2px 0 3px' };
const tileSub: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.72)', marginTop: 6 };

const movTile: React.CSSProperties = {
  ...tileBase, aspectRatio: '4 / 5', padding: 16, display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(160deg,#181423,#110f18)',
};
function donutWrap(inDeg: number): React.CSSProperties {
  return {
    position: 'relative', width: 96, height: 96, borderRadius: '50%', flex: '0 0 auto',
    background: `conic-gradient(#3fe0a0 0deg ${inDeg}deg, #c45464 ${inDeg}deg 360deg)`,
    display: 'grid', placeItems: 'center',
  };
}
const donutHole: React.CSSProperties = {
  width: 62, height: 62, borderRadius: '50%', background: '#13111b',
  display: 'grid', placeItems: 'center', lineHeight: 1.1, textAlign: 'center',
};
const legendRow: React.CSSProperties = { fontSize: 11.5, color: 'rgba(232,226,212,.7)', lineHeight: 1.25 };
const legendDot: React.CSSProperties = { display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 6 };

const placeholderBox: React.CSSProperties = {
  padding: 22, borderRadius: 16, border: '1px dashed rgba(201,163,91,.3)', background: 'rgba(255,255,255,.015)',
};

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

// Modal de avatar
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: 20,
  background: 'rgba(6,5,9,.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
};
const modalCard: React.CSSProperties = {
  position: 'relative', width: 'min(380px, 100%)', padding: '28px 24px 24px', borderRadius: 20,
  border: '1px solid rgba(201,163,91,.3)', background: 'linear-gradient(160deg,#181425,#100e17)',
  boxShadow: '0 30px 70px -30px rgba(0,0,0,.9)', animation: 'domSheetUp .22s ease-out',
};
const modalClose: React.CSSProperties = {
  position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10,
  border: '1px solid rgba(201,163,91,.3)', background: 'transparent', color: '#d8b96b', fontSize: 18, cursor: 'pointer',
};
const modalAvatar: React.CSSProperties = {
  position: 'relative', width: 132, height: 132, borderRadius: '50%', overflow: 'hidden', margin: '4px auto 16px',
  background: 'radial-gradient(120% 100% at 50% 0%, #1e6f4a, #14111c 72%)',
  border: '3px solid', borderColor: 'rgba(201,163,91,.5)', boxShadow: '0 12px 30px -12px rgba(30,177,120,.5)',
};
const marketBtn: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 11, border: '1px solid rgba(201,163,91,.4)',
  background: 'rgba(201,163,91,.08)', color: '#d8b96b', fontWeight: 700, fontSize: 13.5, cursor: 'not-allowed',
};
