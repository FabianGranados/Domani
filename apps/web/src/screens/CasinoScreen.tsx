import { Link } from 'react-router-dom';

// El Casino — sala de juegos de AZAR (solo Aurelios, nunca dinero real).
// Ruleta jugable hoy; el resto llega pronto.

const GAMES = [
  {
    key: 'ruleta',
    name: 'Ruleta',
    img: '/assets/via-casino.webp',
    desc: 'Gira y deja que la suerte hable. Entrada gratis, premio en Aurelios.',
    to: '/ruleta',
    ready: true,
  },
  {
    key: 'poker',
    name: 'Texas Hold’em',
    img: '/assets/mesa-poker.webp',
    desc: 'El clásico del Círculo. Lee a tus rivales y llévate el bote.',
    to: '/poker',
    ready: true,
  },
  {
    key: 'blackjack',
    name: 'Blackjack',
    img: '/assets/casino-mesa.webp',
    desc: 'Veintiuno. Tú contra la banca, nervio puro.',
    to: null,
    ready: false,
  },
  {
    key: 'bacara',
    name: 'Bacará',
    img: '/assets/bar-vip.webp',
    desc: 'Elegancia absoluta. ¿Banca o jugador?',
    to: null,
    ready: false,
  },
];

export function CasinoScreen() {
  return (
    <div>
      {/* ===== Hero del Casino ===== */}
      <div
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          minHeight: 240,
          display: 'flex',
          alignItems: 'flex-end',
          border: '1px solid rgba(201,163,91,.3)',
          boxShadow: '0 24px 60px -28px rgba(0,0,0,.85)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/assets/casino-mesa.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            backgroundColor: '#14111c',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(8,8,10,.9) 0%, rgba(8,8,10,.55) 45%, rgba(8,8,10,.25) 100%), linear-gradient(180deg, transparent 40%, rgba(8,8,10,.9) 100%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(20px,4vw,34px)', maxWidth: 560 }}>
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#d8b96b' }}>
            Sala de azar
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(38px,6vw,58px)', lineHeight: 1.02, color: '#f3eddd', margin: '8px 0 10px' }}>
            El Casino
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(232,226,212,.8)', margin: 0 }}>
            Las mesas clásicas del Círculo. Apuesta tus Aurelios, lee la suerte y haz crecer tu nombre.
          </p>
        </div>
      </div>

      {/* ===== Las mesas ===== */}
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: '#ece6d6', margin: '2rem 0 1rem' }}>
        Las mesas
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
        {GAMES.map((g) => {
          const inner = (
            <div style={gameCard(g.ready)}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${g.img}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#14111c' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.15) 0%, rgba(8,8,10,.55) 50%, rgba(8,8,10,.96) 100%)' }} />
              {!g.ready && <span style={comingBadge}>Próximamente</span>}
              <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: 20, width: '100%' }}>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd' }}>{g.name}</div>
                <div style={{ fontSize: 13.5, color: 'rgba(232,226,212,.78)', margin: '6px 0 12px', lineHeight: 1.45 }}>{g.desc}</div>
                {g.ready ? (
                  <span style={playBtn}>Jugar ahora →</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'rgba(232,226,212,.5)' }}>Disponible muy pronto</span>
                )}
              </div>
            </div>
          );
          return g.ready && g.to ? (
            <Link key={g.key} to={g.to} style={{ textDecoration: 'none' }}>{inner}</Link>
          ) : (
            <div key={g.key}>{inner}</div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: 'rgba(232,226,212,.4)', marginTop: 24, maxWidth: 640 }}>
        Los juegos del Casino son de azar y se juegan únicamente con Aurelios, fichas de fantasía sin
        valor monetario. Nunca hay dinero real ni premios canjeables. Solo +18.
      </p>
    </div>
  );
}

function gameCard(ready: boolean): React.CSSProperties {
  return {
    position: 'relative',
    aspectRatio: '4 / 3',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    border: ready ? '1px solid rgba(201,163,91,.6)' : '1px solid rgba(255,255,255,.08)',
    boxShadow: ready ? '0 18px 44px -22px rgba(201,163,91,.4)' : '0 16px 40px -24px rgba(0,0,0,.85)',
    opacity: ready ? 1 : 0.92,
  };
}
const comingBadge: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 2,
  fontSize: 10,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: '#1a1405',
  background: 'rgba(236,217,165,.9)',
  padding: '4px 9px',
  borderRadius: 999,
  fontWeight: 700,
};
const playBtn: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)',
  color: '#2c2415',
  fontWeight: 700,
  fontSize: 14,
  padding: '10px 20px',
  borderRadius: 11,
  boxShadow: '0 12px 28px -10px rgba(201,163,91,.55)',
};
