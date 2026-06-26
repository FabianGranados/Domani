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
import type { House, LedgerTransaction } from '../lib/types';
import { PremiumCards } from '../components/PremiumCards';
import { ValenteCoach } from '../components/ValenteCoach';
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
  { key: 'academia', img: '/assets/game-academia.webp', to: '/millonaurelios' },
  { key: 'mercado', img: '/assets/hub-mercado.webp', to: '/banco' },
];

const REASON_LABELS: Record<string, string> = {
  renta_ciudadana: 'Renta Ciudadana', academy_reward: 'La Academia', game_win: 'Ganancia',
  game_loss: 'Pérdida', game_buyin: 'Entrada a mesa', tournament_buyin: 'Entrada a torneo',
  tournament_prize: 'Premio de torneo', property_buy: 'Compra', property_sell: 'Venta',
  property_rent: 'Renta de propiedad', tax: 'Impuesto', maintenance: 'Mantenimiento',
  promo_grant: 'Bono', admin_adjust: 'Ajuste', transfer_in_game: 'Transferencia',
  loan_disburse: 'Crédito', loan_repay: 'Abono a crédito',
};

// Juegos de estrategia (bento asimétrico). Fotos PROVISIONALES; se cambian por
// las que suba el usuario. Span por pantalla: d=desktop, m=móvil.
type GameTile = {
  key: string; title: string; tag: string; glyph: string;
  img?: string; grad?: string; d: { c: string; r: string }; m: { c: string; r: string };
};
const GAMES: GameTile[] = [
  { key: 'ajedrez', title: 'Ajedrez', tag: 'La guerra de la mente.', glyph: '♛', img: '/assets/game-ajedrez.webp', d: { c: 'span 2', r: 'span 2' }, m: { c: 'span 2', r: 'span 1' } },
  { key: 'parques', title: 'Parqués', tag: 'Sácala o que te saquen.', glyph: '🎲', img: '/assets/game-parques.webp', d: { c: 'span 1', r: 'span 1' }, m: { c: 'span 1', r: 'span 1' } },
  { key: 'domino', title: 'Dominó', tag: 'La mesa habla.', glyph: '🁢', img: '/assets/game-domino.webp', d: { c: 'span 1', r: 'span 1' }, m: { c: 'span 1', r: 'span 1' } },
  { key: 'damas', title: 'Damas chinas', tag: 'Estrella de estrategas.', glyph: '⛀', img: '/assets/game-damas.webp', d: { c: 'span 1', r: 'span 1' }, m: { c: 'span 2', r: 'span 1' } },
  { key: 'mas', title: 'Y muchos más', tag: 'Super Triunfo, backgammon, cartas…', glyph: '✦', img: '/assets/game-mas.webp', d: { c: 'span 1', r: 'span 1' }, m: { c: 'span 2', r: 'span 1' } },
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
  const [movs, setMovs] = useState<LedgerTransaction[]>([]);

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
    setMovs(led.slice(0, 6));
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

      {/* ════════ ZONA 2 · BIENVENIDA (Valente) + TESSERA ════════ */}
      <SectionTitle title="Tu Tessera" hint="Quién eres en Domani" />
      <ValenteCoach />
      <div style={{ height: 14 }} />
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

      {/* ════════ ZONA 4 · JUEGOS DE ESTRATEGIA (bento) ════════ */}
      <SectionTitle title="Juegos de estrategia" hint="Mente, mesa y honor" />
      <div style={bentoGrid(isDesktop)}>
        {GAMES.map((g) => (
          <div key={g.key} style={gameTile(isDesktop, g)}>
            {g.img && <div style={gameImgScrim} />}
            {!g.img && <span style={gameBigGlyph}>{g.glyph}</span>}
            <div style={gameFoot}>
              <div style={gameTitle}>{g.title}</div>
              <div style={gameTagline}>{g.tag}</div>
            </div>
            <span style={soonPill}>Pronto</span>
          </div>
        ))}
      </div>

      {/* ════════ ZONA 5 · ZONA FINANCIERA ════════ */}
      <SectionTitle title="Zona financiera" hint="Tu banco y tus movimientos" />
      <div style={finGrid(isDesktop)}>
        {/* Domanibank con el logo sobrepuesto */}
        <Link to="/banco" style={{ textDecoration: 'none' }}>
          <div style={bankTile}>
            <div style={bankTopScrim} />
            <img src="/assets/logo-domanibank-t.webp" alt="Domanibank" style={bankLogo} />
            <div style={tileScrim} />
            <div style={tileFoot}>
              <div style={tileSub}>
                ⟡ {balance != null ? fmt(balance) : '—'} {loan ? `· Debes ⟡ ${fmt(loan.outstanding)}` : '· Entrar →'}
              </div>
            </div>
          </div>
        </Link>

        {/* Estado de cuenta */}
        <div style={movCard}>
          <div style={movHeader}>
            <div>
              <div style={tileEyebrow}>Domanibank</div>
              <div style={movTitle}>Tus movimientos</div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={movSumLabel}>Ingresos</div>
                <div style={{ ...movSumVal, color: '#7ee0a6' }}>⟡ {fmt(finIn)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={movSumLabel}>Egresos</div>
                <div style={{ ...movSumVal, color: '#ff9a9a' }}>⟡ {fmt(finOut)}</div>
              </div>
            </div>
          </div>

          <div style={movListWrap}>
            {movs.length === 0 ? (
              <div className="muted" style={{ padding: '28px 0', textAlign: 'center', fontSize: 13 }}>
                Aún no hay movimientos. Reclama tu Renta o juega para empezar.
              </div>
            ) : (
              movs.map((tx) => {
                const pos = tx.amount >= 0;
                return (
                  <div key={tx.id} style={movRow}>
                    <span style={movIcon(pos)}>{pos ? '↑' : '↓'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={movReason}>{REASON_LABELS[tx.reason] ?? tx.reason}</div>
                      <div style={movDate}>{new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div style={{ ...movAmount, color: pos ? '#8ae0a8' : '#ff8a8a' }}>
                      {pos ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link to="/banco" style={movFooter}>Ver todo en Domanibank →</Link>
        </div>
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

// Juegos de estrategia (bento)
function bentoGrid(isDesktop: boolean): React.CSSProperties {
  return {
    display: 'grid', gap: 12, gridAutoFlow: 'dense',
    gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
    gridAutoRows: isDesktop ? '150px' : '124px',
  };
}
function gameTile(isDesktop: boolean, g: GameTile): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', borderRadius: 14,
    border: '1px solid rgba(201,163,91,.2)', boxShadow: '0 14px 34px -24px rgba(0,0,0,.85)',
    gridColumn: isDesktop ? g.d.c : g.m.c, gridRow: isDesktop ? g.d.r : g.m.r, backgroundColor: '#14111c',
    ...(g.img
      ? { backgroundImage: `url('${g.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: g.grad }),
  };
}
const gameImgScrim: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.05) 40%, rgba(8,8,10,.85) 100%)' };
const gameBigGlyph: React.CSSProperties = { position: 'absolute', top: 4, right: 10, fontSize: 54, color: 'rgba(201,163,91,.16)', pointerEvents: 'none' };
const gameFoot: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 13, zIndex: 1 };
const gameTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 17, color: '#f3eddd' };
const gameTagline: React.CSSProperties = { fontSize: 11.5, color: 'rgba(232,226,212,.62)', marginTop: 1 };
const soonPill: React.CSSProperties = {
  position: 'absolute', top: 10, left: 10, zIndex: 2, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
  fontWeight: 700, color: '#1a1405', background: 'rgba(236,217,165,.88)', padding: '3px 8px', borderRadius: 999,
};


// Zona financiera
function finGrid(isDesktop: boolean): React.CSSProperties {
  return { display: 'grid', gap: 14, gridTemplateColumns: isDesktop ? '320px 1fr' : '1fr', alignItems: 'stretch' };
}
// Tarjeta del banco con el logo sobrepuesto.
const bankTile: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', borderRadius: 18, minHeight: 300, height: '100%', cursor: 'pointer',
  border: '1px solid rgba(201,163,91,.35)', boxShadow: '0 18px 44px -26px rgba(0,0,0,.9)',
  backgroundImage: "url('/assets/fin-bank.webp')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c',
};
const bankTopScrim: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: '48%',
  background: 'linear-gradient(180deg, rgba(8,8,10,.72), transparent)',
};
const bankLogo: React.CSSProperties = {
  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: '80%', maxWidth: 250,
  zIndex: 1, filter: 'drop-shadow(0 3px 9px rgba(0,0,0,.65))',
};
const tileScrim: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.05) 45%, rgba(8,8,10,.55) 74%, rgba(8,8,10,.95) 100%)' };
const tileFoot: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, zIndex: 1 };
const tileEyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#d8b96b' };
const tileSub: React.CSSProperties = { fontSize: 13, color: '#ecd9a5', marginTop: 6, fontWeight: 600 };

// Estado de cuenta (lista de movimientos).
const movCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', minHeight: 300, padding: 18, borderRadius: 18,
  border: '1px solid rgba(201,163,91,.22)', background: 'linear-gradient(160deg,#181423,#110f18)',
  boxShadow: '0 18px 44px -26px rgba(0,0,0,.9)',
};
const movHeader: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 };
const movTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 21, color: '#f3eddd', marginTop: 1 };
const movSumLabel: React.CSSProperties = { fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(232,226,212,.5)' };
const movSumVal: React.CSSProperties = { fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 1 };
const movListWrap: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', marginTop: 4 };
const movRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' };
function movIcon(pos: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto', width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700,
    background: pos ? 'rgba(126,224,166,.14)' : 'rgba(255,138,138,.14)', color: pos ? '#7ee0a6' : '#ff9a9a',
    border: `1px solid ${pos ? 'rgba(126,224,166,.3)' : 'rgba(255,138,138,.3)'}`,
  };
}
const movReason: React.CSSProperties = { fontSize: 13.5, color: '#ece6d6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const movDate: React.CSSProperties = { fontSize: 11, color: 'rgba(232,226,212,.45)', marginTop: 1 };
const movAmount: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' };
const movFooter: React.CSSProperties = { textAlign: 'center', padding: '13px 0 2px', marginTop: 'auto', color: '#7ee0a6', fontSize: 13, fontWeight: 700, textDecoration: 'none' };

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
