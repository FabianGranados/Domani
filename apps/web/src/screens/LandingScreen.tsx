import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Isologo } from '../components/Isologo';
import { Carousel } from '../components/Carousel';

// Landing pública de DOMANI (puerta del club). Recreada del diseño hi-fi.
// Negro + oro · Marcellus / Cormorant / Hanken. CTAs -> /login.

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

const VIAS = [
  {
    eyebrow: 'Las Casas',
    title: 'Los Casinos',
    img: '/assets/via-casino.webp',
    pos: 'center 18%',
    desc: 'Entra a los casinos de cada Casa: póker, blackjack y las mesas clásicas. Apuesta, gana y llena tu billetera de Aurelios.',
  },
  {
    eyebrow: 'Pura estrategia',
    title: 'Juegos de destreza',
    img: '/assets/via-destreza.webp',
    pos: 'center',
    desc: 'Ajedrez, damas, parqués y más. Aquí no manda el azar: manda tu cabeza. Demuestra tu talento y llévate el bote.',
  },
  {
    eyebrow: 'El concurso',
    title: 'La Academia',
    img: '/assets/via-academia.webp',
    pos: 'center 12%',
    desc: 'Nuestro concurso de cultura general, al estilo «¿Quién quiere ser millonario?». Responde bien y gana montañas de Aurelios.',
  },
  {
    eyebrow: 'No solo juegas, inviertes',
    title: 'El Mercado',
    img: '/assets/via-mercado.webp',
    pos: 'center',
    desc: 'Compra y vende propiedades y activos. En Domani no solo se juega: también se invierte. Haz crecer tu billetera cada día.',
  },
];

export function LandingScreen() {
  useEffect(() => {
    // Video de fondo: muted + loop + autoplay configurado por JS.
    const vid = document.getElementById('dom-intro-video') as HTMLVideoElement | null;
    // Video liviano (~3MB): autoplay en todos los dispositivos. Mientras
    // carga se ve el poster, así nunca queda en negro.
    if (vid) {
      vid.muted = true;
      vid.loop = true;
      vid.preload = 'auto';
      const tryPlay = () => {
        const p = vid.play();
        if (p && p.catch) p.catch(() => {});
      };
      if (vid.readyState >= 2) tryPlay();
      else vid.addEventListener('canplay', tryPlay, { once: true });
    }

    // Reveal on scroll (estado final SIEMPRE visible por fallback).
    const revealAll = () =>
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).style.opacity = '1';
              (e.target as HTMLElement).style.transform = 'none';
              io!.unobserve(e.target);
            }
          }),
        { threshold: 0.16 }
      );
      document.querySelectorAll('[data-reveal]').forEach((el) => io!.observe(el));
      const t = setTimeout(revealAll, 2800);
      return () => {
        io?.disconnect();
        clearTimeout(t);
      };
    } catch {
      revealAll();
    }

    // Barra de progreso de scroll.
    const bar = document.querySelector<HTMLElement>('[data-progress]');
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight || 1;
      const p = Math.min(1, (window.scrollY || h.scrollTop) / max);
      if (bar) bar.style.width = p * 100 + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'hidden',
        background: '#08080a',
        fontFamily: "'Hanken Grotesk',sans-serif",
        color: '#ece6d6',
      }}
    >
      {/* progress */}
      <div
        data-progress
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          width: 0,
          zIndex: 60,
          background: 'linear-gradient(90deg,#a8843f,#ecd28e)',
          boxShadow: '0 0 12px rgba(201,163,91,.6)',
        }}
      />

      {/* NAV */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          background: 'linear-gradient(180deg, rgba(8,8,10,.9), transparent)',
        }}
      >
        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 20, letterSpacing: '.34em', paddingLeft: '.34em' }}>
          DOMANI
        </div>
        <Link
          to="/login"
          style={{
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: '.12em',
            color: '#2c2415',
            padding: '11px 22px',
            borderRadius: 10,
            background: GOLD_GRAD,
            boxShadow: '0 8px 20px -8px rgba(201,163,91,.5)',
          }}
        >
          Entrar
        </Link>
      </div>

      {/* HERO */}
      <section
        style={{
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          padding: '120px 24px 90px',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: "url('/assets/hero.webp') 72% center/cover no-repeat",
              backgroundColor: '#0c0d11',
              animation: 'domKen 22s ease-in-out infinite alternate',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(90deg, rgba(8,8,10,.94) 0%, rgba(8,8,10,.82) 30%, rgba(8,8,10,.34) 56%, rgba(8,8,10,.18) 78%, rgba(8,8,10,.55) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(180deg, rgba(8,8,10,.55) 0%, transparent 22%, transparent 70%, rgba(8,8,10,.85) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: 600,
            boxSizing: 'border-box',
            padding: '0 clamp(20px,5vw,48px)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Isologo size={76} />
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: '#9c7a3e',
              marginBottom: 30,
              maxWidth: '100%',
              lineHeight: 1.6,
            }}
          >
            Club privado internacional de juegos
          </div>
          <div
            style={{
              fontFamily: 'Marcellus,serif',
              fontSize: 'clamp(44px,11vw,104px)',
              letterSpacing: 'clamp(.12em,2.5vw,.28em)',
              color: '#ece6d6',
              lineHeight: 0.94,
              maxWidth: '100%',
              textShadow: '0 6px 50px rgba(0,0,0,.6)',
            }}
          >
            DOMANI
          </div>
          <div style={{ width: 72, height: 1, background: 'linear-gradient(90deg,#c9a35b,transparent)', margin: '30px 0 26px' }} />
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontStyle: 'italic',
              fontSize: 'clamp(22px,3vw,29px)',
              lineHeight: 1.42,
              color: 'rgba(232,226,212,.9)',
              maxWidth: 520,
            }}
          >
            No es un casino. Es una sociedad. Aquí el poder es silencioso y el lujo, discreto.
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 44, flexWrap: 'wrap' }}>
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
                color: '#2c2415',
                padding: '17px 36px',
                borderRadius: 13,
                background: GOLD_GRAD,
                boxShadow: '0 16px 38px -10px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.4)',
              }}
            >
              Crear mi cuenta
            </Link>
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 15,
                color: '#e8e2d4',
                padding: '17px 30px',
                borderRadius: 13,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.16)',
              }}
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(232,226,212,.4)' }}>
            Desliza
          </div>
          <div style={{ color: '#9c7a3e', animation: 'domArrow 1.8s ease-in-out infinite' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 9 L12 15 L18 9" />
            </svg>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section
        style={{
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          background: '#08080a',
        }}
      >
        <video
          id="dom-intro-video"
          muted
          loop
          playsInline
          preload="none"
          poster="/assets/hero.webp"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src="/assets/domani-intro.mp4" type="video/mp4" />
        </video>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(90deg, rgba(8,8,10,.93) 0%, rgba(8,8,10,.8) 32%, rgba(8,8,10,.36) 58%, rgba(8,8,10,.18) 80%, rgba(8,8,10,.52) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'linear-gradient(180deg, rgba(8,8,10,.55) 0%, transparent 22%, transparent 66%, rgba(8,8,10,.9) 100%)',
          }}
        />
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: 'translateY(24px)',
            transition: 'opacity .9s ease, transform .9s ease',
            position: 'relative',
            zIndex: 3,
            maxWidth: 660,
            padding: '120px clamp(32px,7vw,112px)',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '.42em', textTransform: 'uppercase', color: '#d8b96b' }}>
            El salón privado
          </div>
          <h2
            style={{
              margin: '24px 0 0',
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 500,
              fontSize: 'clamp(48px,6vw,84px)',
              lineHeight: 1.04,
              color: '#f3eddd',
            }}
          >
            Gana la mesa.
            <br />
            Gana el{' '}
            <span
              style={{
                background: 'linear-gradient(100deg,#a8843f,#ecd28e 35%,#f7e9bd 50%,#ecd28e 65%,#a8843f)',
                backgroundSize: '220% auto',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                animation: 'domShine 4s ease-in-out infinite',
              }}
            >
              respeto.
            </span>
          </h2>
          <div style={{ height: 1, width: 96, margin: '34px 0 28px', background: 'linear-gradient(90deg,#c9a35b,transparent)' }} />
          <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '.26em', textTransform: 'uppercase', color: '#ece6d6' }}>
            Póker · Blackjack · Ajedrez · Bacará · y mucho más
          </div>
          <div style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(232,226,212,.74)', marginTop: 18, maxWidth: 480 }}>
            Cada partida que conquistas te hace más grande. Entre más juegos ganes, más alto pesará tu nombre en el Círculo.
          </div>
        </div>
      </section>

      {/* VÍAS */}
      <section style={{ position: 'relative', padding: '130px 40px 140px', background: 'linear-gradient(180deg,#0a0a0c,#0c0d11)', overflow: 'hidden' }}>
        <div
          data-reveal
          style={{ opacity: 0, transform: 'translateY(28px)', transition: 'opacity .9s ease, transform .9s ease', maxWidth: 1280, margin: '0 auto 56px' }}
        >
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>Tu billetera</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(40px,5vw,54px)', lineHeight: 1.08, color: '#ece6d6', marginTop: 14 }}>
            No solo se juega. <span style={{ color: '#ecd9a5' }}>Todo suma.</span>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(232,226,212,.62)', marginTop: 16, maxWidth: 620 }}>
            Cada Aurelio que ganas y cada favor que compras te acerca a lo más alto del Círculo. Estas son tus vías para crecer.
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Carousel>
            {VIAS.map((v) => (
              <div
                key={v.title}
                className="via-card"
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  width: 'clamp(220px, 72vw, 260px)',
                  aspectRatio: '3/4',
                  scrollSnapAlign: 'start',
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid rgba(201,163,91,.22)',
                  boxShadow: '0 18px 40px -22px rgba(0,0,0,.8)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `url('${v.img}') ${v.pos}/cover no-repeat`,
                    backgroundColor: '#14111c',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 38%,rgba(8,8,10,.9) 100%)' }} />
                <div className="via-desc" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,8,10,.78),rgba(10,9,7,.94))', opacity: 0, transition: 'opacity .4s ease', display: 'flex', alignItems: 'center', padding: 26 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.62, color: 'rgba(236,230,214,.9)' }}>{v.desc}</div>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22, zIndex: 3, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e' }}>{v.eyebrow}</div>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd', marginTop: 4 }}>{v.title}</div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </section>

      {/* STATS */}
      <div
        data-reveal
        style={{
          opacity: 0,
          transform: 'translateY(24px)',
          transition: 'opacity .9s ease, transform .9s ease',
          display: 'flex',
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(201,163,91,.16)',
          borderBottom: '1px solid rgba(201,163,91,.16)',
          background: 'linear-gradient(180deg,#0c0d11,#0a0a0c)',
        }}
      >
        {[
          ['VII', 'Casas en el mundo'],
          ['11.240', 'Miembros activos'],
          ['Cada noche', 'El Círculo se reúne'],
        ].map(([big, small], i) => (
          <div key={i} style={{ flex: 1, minWidth: 220, textAlign: 'center', padding: '34px 20px', borderRight: i < 2 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 40, color: '#ecd9a5' }}>{big}</div>
            <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9c7a3e', marginTop: 6 }}>{small}</div>
          </div>
        ))}
      </div>

      {/* PROMESA */}
      <section style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', minHeight: '92vh', padding: '120px clamp(32px,7vw,112px)' }}>
        <div style={{ position: 'absolute', inset: 0, background: "url('/assets/promesa-bg.webp') center/cover no-repeat", backgroundColor: '#0a0a0c', animation: 'domKen 24s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,10,.93) 0%, rgba(8,8,10,.82) 30%, rgba(8,8,10,.42) 58%, rgba(8,8,10,.2) 80%, rgba(8,8,10,.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,10,.5) 0%, transparent 24%, transparent 70%, rgba(8,8,10,.88) 100%)' }} />
        <div data-reveal style={{ opacity: 0, transform: 'translateY(34px)', transition: 'opacity .9s ease, transform .9s ease', position: 'relative', zIndex: 2, maxWidth: 560 }}>
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#d8b96b', marginBottom: 22 }}>La promesa</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(44px,6vw,62px)', lineHeight: 1.06, color: '#ece6d6' }}>
            Prepárate para convertirte en un <span style={{ color: '#ecd9a5' }}>Don</span>.
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 26, color: 'rgba(232,226,212,.7)', marginTop: 14 }}>
            O quédate como un ciudadano cualquiera.
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.75, color: 'rgba(232,226,212,.74)', marginTop: 28, maxWidth: 480 }}>
            En Domani no compras tu lugar: lo ganas. Empiezas como ciudadano y asciendes mesa a mesa hasta lo más alto del Círculo. Tu Casa es tu bandera; tu rango, tu poder.
          </div>
          <Link to="/login" style={{ display: 'inline-block', textDecoration: 'none', fontWeight: 600, fontSize: 14, color: '#d8b96b', padding: '14px 28px', borderRadius: 12, border: '1px solid rgba(201,163,91,.5)', marginTop: 30, background: 'rgba(8,8,10,.35)' }}>
            Empieza tu ascenso →
          </Link>
        </div>
      </section>

      {/* ANFITRIÓN */}
      <section style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 70, padding: '120px 60px', background: 'linear-gradient(180deg,#0a0a0c,#0c0d11)', flexWrap: 'wrap' }}>
        <div data-reveal style={{ opacity: 0, transform: 'translateY(30px)', transition: 'opacity 1s ease, transform 1s ease', position: 'relative', display: 'flex', justifyContent: 'center', minWidth: 300 }}>
          <div style={{ position: 'absolute', left: '50%', top: '48%', transform: 'translate(-50%,-50%)', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,163,91,.16), transparent 66%)' }} />
          <img src="/assets/valente_cut.webp" alt="Domenico Valente" style={{ position: 'relative', height: 480, width: 'auto', maxWidth: '100%', display: 'block', filter: 'drop-shadow(0 28px 38px rgba(0,0,0,.6))', animation: 'domFloatY 7s ease-in-out infinite' }} />
        </div>
        <div data-reveal style={{ opacity: 0, transform: 'translateY(30px)', transition: 'opacity 1s ease .15s, transform 1s ease .15s', flex: 1, minWidth: 320, maxWidth: 480 }}>
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 20 }}>El anfitrión</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 40, lineHeight: 1.3, color: '#ece6d6' }}>
            «Cada noche se decide quién asciende. Yo te enseñaré a jugar tus cartas.»
          </div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 17, color: '#ecd9a5', marginTop: 24 }}>Domenico Valente</div>
          <div style={{ fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9c7a3e', marginTop: 5 }}>Anfitrión de Domani</div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', padding: '120px 24px' }}>
        <picture style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <source media="(max-width:768px)" srcSet="/assets/entrada-a.webp" />
          <img src="/assets/entrada-b.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'domKen 26s ease-in-out infinite alternate' }} />
        </picture>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(54% 60% at 50% 48%, rgba(8,8,10,.74), rgba(8,8,10,.36) 72%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(8,8,10,.72) 0%, transparent 26%, transparent 52%, rgba(8,8,10,.97) 100%)' }} />
        <div data-reveal style={{ opacity: 0, transform: 'translateY(30px)', transition: 'opacity 1s ease, transform 1s ease', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 640 }}>
          <div style={{ marginBottom: 22 }}>
            <Isologo size={70} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: '.46em', textTransform: 'uppercase', color: '#d8b96b', marginBottom: 22 }}>El acceso</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(44px,6vw,74px)', lineHeight: 1.02, color: '#f3eddd', textShadow: '0 6px 50px rgba(0,0,0,.8)' }}>
            Cruza la puerta
            <br />
            del <span style={{ color: '#ecd9a5' }}>Círculo</span>.
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(236,230,214,.85)', marginTop: 22, maxWidth: 520 }}>
            El portero solo deja pasar a los registrados. Y entrar es <b style={{ color: '#fff' }}>gratis</b>: te registras, eliges tu Casa y la noche es tuya.
          </div>
          <Link to="/login" style={{ position: 'relative', textDecoration: 'none', fontWeight: 700, fontSize: 17, color: '#2c2415', padding: '20px 54px', borderRadius: 14, background: GOLD_GRAD, boxShadow: '0 24px 56px -12px rgba(201,163,91,.65), inset 0 1px 0 rgba(255,255,255,.45)', marginTop: 40 }}>
            Crear mi cuenta — gratis
          </Link>
          <Link to="/login" style={{ textDecoration: 'none', fontSize: 14, color: 'rgba(236,230,214,.72)', marginTop: 18 }}>
            ¿Ya eres miembro? <span style={{ color: '#d8b96b', fontWeight: 600 }}>Entrar</span>
          </Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 40 }}>
            {['Gratis para siempre', 'Sin tarjeta de crédito', 'Sin apuestas reales · +18'].map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(236,230,214,.8)', padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(201,163,91,.3)', background: 'rgba(8,8,10,.5)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d8b96b" strokeWidth="2.4">
                  <path d="M20 6 L9 17 L4 12" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div style={{ padding: '42px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap', gap: 16, background: '#08080a' }}>
        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, letterSpacing: '.3em', color: 'rgba(232,226,212,.7)', paddingLeft: '.3em' }}>DOMANI</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: 'rgba(232,226,212,.36)', maxWidth: 560, textAlign: 'right' }}>
          Domani es una experiencia de entretenimiento para mayores de 18 años. Los Aurelios son fichas virtuales sin valor monetario real; no hay apuestas ni premios en dinero. © MMXXV Domani.
        </div>
      </div>
    </div>
  );
}
