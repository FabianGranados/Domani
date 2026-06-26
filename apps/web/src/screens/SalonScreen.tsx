import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { claimRenta, getWallet, listHouses, getMudanzaQuote, mudarse, type MudanzaQuote } from '../lib/api';
import type { House } from '../lib/types';
import { ValenteIntro, valenteSeen } from '../components/ValenteIntro';
import { Carousel } from '../components/Carousel';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

const HOUSE_ORDER = ['bacata', 'empire', 'plata', 'morro', 'roma', 'osaka', 'aztlan'];
const HOUSE_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.webp',
  empire: '/assets/casa-empire.webp',
  plata: '/assets/casa-plata.webp',
  morro: '/assets/casa-morro.webp',
  roma: '/assets/casa-roma.webp',
  osaka: '/assets/casa-osaka.webp',
  aztlan: '/assets/casa-aztlan.webp',
};

const RANKS = [
  { key: 'ciudadano_nuevo', label: 'Ciudadano' },
  { key: 'ciudadano_activo', label: 'Activo' },
  { key: 'ciudadano_reconocido', label: 'Reconocido' },
  { key: 'ciudadano_patricio', label: 'Patricio' },
  { key: 'consigliere', label: 'Consigliere' },
  { key: 'don', label: 'Don' },
];

const SALAS = [
  { key: 'casino', title: 'El Casino', img: '/assets/via-casino.webp', desc: 'Texas Hold’em, Ruleta y Blackjack.', to: '/casino', ready: true },
  { key: 'academia', title: 'La Academia', img: '/assets/via-academia.webp', desc: 'Concurso de cultura general.', to: '/academia', ready: true },
  { key: 'destreza', title: 'Destreza', img: '/assets/via-destreza.webp', desc: 'Ajedrez, damas y dominó.', to: null, ready: false },
  { key: 'mercado', title: 'El Mercado', img: '/assets/via-mercado.webp', desc: 'Compra casa, taxi, bus o invierte en oro.', to: null, ready: false },
];

export function SalonScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [rentaMsg, setRentaMsg] = useState<string | null>(null);
  const [rentaErr, setRentaErr] = useState<string | null>(null);
  const [rentaBusy, setRentaBusy] = useState(false);
  const [showValente, setShowValente] = useState(false);
  // Mudanza
  const [mudTarget, setMudTarget] = useState<House | null>(null);
  const [mudQuote, setMudQuote] = useState<MudanzaQuote | null>(null);
  const [mudBusy, setMudBusy] = useState(false);
  const [mudErr, setMudErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => {
      hs.sort((a, b) => HOUSE_ORDER.indexOf(a.code) - HOUSE_ORDER.indexOf(b.code));
      setHouses(hs);
    });
    if (!valenteSeen()) setShowValente(true);
  }, [user]);

  const dayNum = Math.floor(Date.now() / 86_400_000);
  const challengeHouse = houses.find((h) => h.code === HOUSE_ORDER[dayNum % HOUSE_ORDER.length]);
  const rankIdx = Math.max(0, RANKS.findIndex((r) => r.key === profile?.rank));
  const nextRank = RANKS[rankIdx + 1];

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

  async function openMudanza(h: House) {
    setMudTarget(h); setMudQuote(null); setMudErr(null);
    try { setMudQuote(await getMudanzaQuote(h.code)); }
    catch { setMudErr('No se pudo calcular la mudanza.'); }
  }
  async function confirmMudanza() {
    if (!mudTarget) return;
    setMudBusy(true); setMudErr(null);
    try {
      const r = await mudarse(mudTarget.code);
      setBalance(r.balance);
      await refreshProfile();
      setMudTarget(null); setMudQuote(null);
    } catch (e) {
      setMudErr(e instanceof Error ? e.message : 'No se pudo completar la mudanza.');
    } finally { setMudBusy(false); }
  }

  return (
    <div>
      {showValente && <ValenteIntro onClose={() => setShowValente(false)} />}

      {/* ===== Cabecera ===== */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>Bienvenido al salón</div>
          <h1 className="page-title" style={{ marginTop: 8, marginBottom: 0 }}>
            Buenas noches, <span style={{ color: '#ecd9a5' }}>{profile?.alias}</span>.
          </h1>
        </div>
        <button onClick={() => setShowValente(true)} style={ghostBtn}>
          🎩 Habla con Valente
        </button>
      </div>

      {/* ===== Tarjetas premium (Tessera · Billetera/Renta · Ascenso) ===== */}
      <div style={{ marginTop: '1.4rem' }}>
        <Carousel>
        {/* GOLD — Tessera */}
        <div style={premiumCard('gold')}>
          <div style={sheen} />
          <div style={cardTop}>
            <span style={cardLabel('gold')}>DOMANI · Tessera</span>
            <img src="/assets/emblema-aurelio.webp" alt="" style={chipImg} />
          </div>
          <div style={cardMain('gold')}>{profile?.alias}</div>
          <div style={cardBottom}>
            <div>
              <div style={miniLabel('gold')}>Ciudad</div>
              <div style={miniVal('gold')}>
                {houses.find((h) => h.id === profile?.house_id)?.name.replace(/^Casa /, '') ?? 'Sin ciudad'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={miniLabel('gold')}>Rango</div>
              <div style={miniVal('gold')}>{RANKS[rankIdx].label}</div>
            </div>
          </div>
        </div>

        {/* SILVER — Billetera + Renta */}
        <div style={premiumCard('silver')}>
          <div style={sheen} />
          <div style={cardTop}>
            <span style={cardLabel('silver')}>Tu billetera</span>
            <img src="/assets/aurelio-coin.webp" alt="" style={coinChip} />
          </div>
          <div style={cardMain('silver')}>⟡ {balance ?? '—'}</div>
          <div>
            <button onClick={reclamar} disabled={rentaBusy} style={cardBtn}>
              {rentaBusy ? 'Reclamando…' : 'Reclamar Renta diaria'}
            </button>
            {rentaMsg && <div style={{ fontSize: 12, color: '#1d6b3f', marginTop: 6 }}>{rentaMsg}</div>}
            {rentaErr && <div style={{ fontSize: 12, color: '#8a1f1f', marginTop: 6 }}>{rentaErr}</div>}
          </div>
        </div>

        {/* OBSIDIAN — Ascenso */}
        <div style={premiumCard('obsidian')}>
          <div style={sheen} />
          <div style={cardTop}>
            <span style={cardLabel('obsidian')}>Tu ascenso</span>
            <span style={{ fontSize: 11, color: '#9c7a3e' }}>Influencia · {profile?.influence ?? 0}</span>
          </div>
          <div style={cardMain('obsidian')}>{RANKS[rankIdx].label}</div>
          <div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {RANKS.map((r, i) => (
                <span
                  key={r.key}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 999,
                    background: i <= rankIdx ? GOLD_GRAD : 'rgba(255,255,255,.14)',
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.6)' }}>
              {nextRank ? `Próximo: ${nextRank.label}` : 'Has llegado a la cima.'}
            </div>
          </div>
        </div>
        </Carousel>
      </div>

      {/* ===== SALAS ===== */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2.4rem 0 1rem' }}>
        <h2 style={sectionTitle}>Las Salas</h2>
        <span className="muted" style={{ fontSize: 13 }}>¿Dónde juegas esta noche? →</span>
      </div>
      <Carousel>
        {SALAS.map((s) => {
          const card = (
            <div style={{ ...salaCard, opacity: s.ready ? 1 : 0.72 }}>
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
            <Link key={s.key} to={s.to} style={{ textDecoration: 'none', scrollSnapAlign: 'start' }}>{card}</Link>
          ) : (
            <div key={s.key} style={{ scrollSnapAlign: 'start' }}>{card}</div>
          );
        })}
      </Carousel>

      {/* ===== CASAS ===== */}
      <div style={{ margin: '2.8rem 0 0.6rem' }}>
        <h2 style={sectionTitle}>Las Ciudades</h2>
        <p className="muted" style={{ maxWidth: 660, marginTop: 6 }}>
          Tu ciudad es tu bandera: cualquiera puede entrar a cualquiera. Cada día, una ciudad al azar recibe un{' '}
          <strong style={{ color: '#ecd9a5' }}>desafío</strong> que reparte Aurelios. Elige por cuál luchar.
        </p>
      </div>

      {challengeHouse && (
        <div style={desafioBanner}>
          <img src="/assets/emblema-aurelio.webp" alt="" style={{ width: 40, height: 40, objectFit: 'contain', flex: '0 0 auto' }} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.26em', textTransform: 'uppercase', color: '#9c7a3e' }}>Desafío del día</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, color: '#f3eddd' }}>
              Hoy reparte Aurelios la <span style={{ color: '#ecd9a5' }}>{challengeHouse.name}</span>
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(232,226,212,.45)', whiteSpace: 'nowrap' }}>Próximamente</span>
        </div>
      )}

      <Carousel>
        {houses.map((h) => {
          const isMine = profile?.house_id === h.id;
          return (
            <div key={h.id} style={houseCard(isMine)}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${HOUSE_IMG[h.code]}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.1) 0%, rgba(8,8,10,.45) 48%, rgba(8,8,10,.96) 100%)' }} />
              {isMine && <span style={tuCasaBadge}>✓ Tu ciudad</span>}
              <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: 16, width: '100%' }}>
                <div style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#d8b96b' }}>{h.city}</div>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 21, color: '#f3eddd', margin: '2px 0 10px' }}>{h.name.replace(/^Casa /, '')}</div>
                {!isMine && (
                  <button onClick={() => openMudanza(h)} disabled={mudBusy} style={{ ...btnBase, ...btnGoldStyle, opacity: mudBusy ? 0.6 : 1 }}>
                    Mudarme aquí
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Carousel>

      {/* ===== Modal de mudanza ===== */}
      {mudTarget && (
        <div style={mudOverlay} onClick={() => !mudBusy && setMudTarget(null)}>
          <div style={mudCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', color: '#9c7a3e' }}>Mudanza</div>
            <h3 style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd', margin: '6px 0 8px' }}>
              Mudarte a {mudTarget.name.replace(/^Casa /, '')}
            </h3>
            {!mudQuote ? (
              <p className="muted">Calculando costo…</p>
            ) : mudQuote.current ? (
              <p className="muted">Ya vives aquí.</p>
            ) : (
              <>
                {mudQuote.is_free ? (
                  <p style={{ color: '#7ee0a6', fontWeight: 700 }}>Tu primera mudanza es GRATIS.</p>
                ) : (
                  <p style={{ color: 'rgba(232,226,212,.82)', lineHeight: 1.5 }}>
                    Impuesto de mudanza: <b style={{ color: '#ecd9a5' }}>⟡ {mudQuote.fee.toLocaleString('es-CO')}</b>
                    {' '}({Math.round(mudQuote.fee_pct * 100)}% de tu patrimonio). Se paga a Hacienda.
                  </p>
                )}
                {mudQuote.days_left > 0 && <p style={{ color: '#ffb4b4' }}>En enfriamiento: disponible en {mudQuote.days_left} días.</p>}
                {!mudQuote.is_free && mudQuote.balance < mudQuote.fee && <p style={{ color: '#ffb4b4' }}>Saldo insuficiente.</p>}
              </>
            )}
            {mudErr && <p style={{ color: '#ff8a8a', fontSize: 13, marginTop: 4 }}>{mudErr}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setMudTarget(null)} disabled={mudBusy} style={mudGhost}>Cancelar</button>
              <button onClick={confirmMudanza} disabled={mudBusy || !mudQuote?.can_move} style={{ ...btnBase, ...btnGoldStyle, flex: 1, opacity: mudBusy || !mudQuote?.can_move ? 0.5 : 1 }}>
                {mudBusy ? 'Mudándote…' : mudQuote?.is_free ? 'Mudarme gratis' : 'Pagar y mudarme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- estilos ----
const sectionTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 30, margin: 0, color: '#ece6d6' };
const mudOverlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,5,9,.72)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 };
const mudCard: React.CSSProperties = { width: '100%', maxWidth: 380, background: 'linear-gradient(180deg,#1a1722,#120f19)', border: '1px solid rgba(201,163,91,.28)', borderRadius: 18, padding: '22px 22px 20px', boxShadow: '0 30px 80px -30px rgba(0,0,0,.9)' };
const mudGhost: React.CSSProperties = { padding: '11px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: 'rgba(232,226,212,.8)', fontSize: 14, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif" };
const ghostBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 11, border: '1px solid rgba(201,163,91,.45)', background: 'rgba(8,8,10,.35)', color: '#d8b96b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif" };
const salaCard: React.CSSProperties = { position: 'relative', flex: '0 0 auto', width: 270, height: 320, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(201,163,91,.2)', boxShadow: '0 18px 40px -22px rgba(0,0,0,.8)' };
const salaImg: React.CSSProperties = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c' };
const salaScrim: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,8,10,.92) 100%)' };
const comingSoon: React.CSSProperties = { position: 'absolute', top: 12, right: 12, zIndex: 3, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1a1405', background: 'rgba(236,217,165,.9)', padding: '4px 9px', borderRadius: 999, fontWeight: 700 };
const btnBase: React.CSSProperties = { display: 'block', width: '100%', padding: '10px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, textAlign: 'center', cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif" };
const btnGoldStyle: React.CSSProperties = { background: GOLD_GRAD, color: '#2c2415', border: 'none' };

const desafioBanner: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 18px',
  borderRadius: 14,
  border: '1px solid rgba(201,163,91,.4)',
  background: 'linear-gradient(135deg, rgba(201,163,91,.10), rgba(255,255,255,.02))',
  marginBottom: '1.2rem',
};
function houseCard(isMine: boolean): React.CSSProperties {
  return {
    position: 'relative',
    flex: '0 0 auto',
    width: 'clamp(180px, 62vw, 215px)',
    aspectRatio: '3 / 4',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    scrollSnapAlign: 'start',
    border: isMine ? '1px solid rgba(201,163,91,.85)' : '1px solid rgba(255,255,255,.08)',
    boxShadow: isMine ? '0 16px 40px -20px rgba(201,163,91,.5)' : '0 16px 40px -24px rgba(0,0,0,.85)',
  };
}
const tuCasaBadge: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 2,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.04em',
  color: '#2c2415',
  background: GOLD_GRAD,
  padding: '4px 10px',
  borderRadius: 999,
};

// ---- tarjetas premium (estilo tarjeta de crédito) ----
type Metal = 'gold' | 'silver' | 'obsidian';
const METAL_BG: Record<Metal, string> = {
  gold: 'linear-gradient(135deg,#f7e7ad 0%,#dcb761 28%,#a8843f 52%,#f0d489 72%,#8a6730 100%)',
  silver: 'linear-gradient(135deg,#f4f6f8 0%,#cdd4da 28%,#9aa2a9 52%,#e9edf0 72%,#7c838a 100%)',
  obsidian: 'linear-gradient(135deg,#2a2536 0%,#1a1726 50%,#100e18 100%)',
};
const METAL_INK: Record<Metal, string> = { gold: '#2c2412', silver: '#23282e', obsidian: '#ece6d6' };

function premiumCard(metal: Metal): React.CSSProperties {
  return {
    position: 'relative',
    overflow: 'hidden',
    flex: '0 0 auto',
    width: 'clamp(280px, 82vw, 320px)',
    scrollSnapAlign: 'start',
    aspectRatio: '1.62 / 1',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: METAL_INK[metal],
    background: METAL_BG[metal],
    border: metal === 'obsidian' ? '1px solid rgba(201,163,91,.4)' : '1px solid rgba(255,255,255,.4)',
    boxShadow: '0 22px 50px -22px rgba(0,0,0,.85)',
  };
}
const sheen: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '45%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)',
  transform: 'skewX(-16deg)',
  animation: 'domShimmer 6.5s ease-in-out infinite',
  pointerEvents: 'none',
};
const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 };
const cardBottom: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 1 };
function cardLabel(metal: Metal): React.CSSProperties {
  return { fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 700, color: metal === 'obsidian' ? '#9c7a3e' : 'rgba(0,0,0,.55)' };
}
function cardMain(metal: Metal): React.CSSProperties {
  return { fontFamily: metal === 'obsidian' ? "'Cormorant Garamond',serif" : 'Marcellus, serif', fontSize: metal === 'obsidian' ? 30 : 26, position: 'relative', zIndex: 1, color: metal === 'obsidian' ? '#ecd9a5' : METAL_INK[metal] };
}
function miniLabel(metal: Metal): React.CSSProperties {
  return { fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: metal === 'obsidian' ? '#9c7a3e' : 'rgba(0,0,0,.5)' };
}
function miniVal(metal: Metal): React.CSSProperties {
  return { fontSize: 14, fontWeight: 600, color: metal === 'obsidian' ? '#ece6d6' : METAL_INK[metal] };
}
const chipImg: React.CSSProperties = { width: 38, height: 38, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' };
const coinChip: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,.35)' };
const cardBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg,#2c2412,#1a1509)',
  color: '#ecd9a5',
  border: '1px solid rgba(0,0,0,.25)',
  padding: '9px 16px',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
