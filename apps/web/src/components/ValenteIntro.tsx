import { useState } from 'react';

// Domenico Valente — anfitrión de DOMANI. Da la bienvenida y explica
// de qué se trata el juego en mensajes cortos. Se muestra una vez
// (guardado en localStorage), y se puede volver a abrir desde el Salón.

const MESSAGES = [
  'Bienvenido al Círculo. Soy Domenico Valente, tu anfitrión esta noche.',
  'Esto no es un casino. Es una sociedad. Aquí el respeto se gana… nunca se compra.',
  'Juegas en las Salas —el Casino, la Academia, los juegos de destreza— y ganas Aurelios, nuestra moneda.',
  'Con Aurelios accedes a mesas más altas y, algún día, a lujos que pocos pueden permitirse.',
  'Elige una ciudad y lucha por su nombre. Pero tu verdadero ascenso es tuyo: empiezas como Ciudadano… y si demuestras tu valía, llegarás a ser un Don.',
  'Una advertencia de la casa: aquí solo se juega con Aurelios, fichas de fantasía. Jamás dinero real. La gloria es lo único en juego.',
  'El Círculo te espera. Que la suerte —y la astucia— te acompañen.',
];

const STORAGE_KEY = 'domani_valente_seen_v1';

export function valenteSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function ValenteIntro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step >= MESSAGES.length - 1;

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose();
  }

  return (
    <div className="valente-overlay">
      <div className="valente-inner">
        {/* Valente */}
        <img className="valente-img" src="/assets/valente_cut.webp" alt="Domenico Valente" />

        {/* Mensaje */}
        <div
          className="valente-bubble"
          style={{
            background: 'linear-gradient(180deg, rgba(33,27,46,.96), rgba(20,17,28,.96))',
            border: '1px solid rgba(201,163,91,.35)',
            borderRadius: 18,
            padding: '26px 26px 22px',
            boxShadow: '0 30px 70px -30px rgba(0,0,0,.9)',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', color: '#9c7a3e' }}>
            Domenico Valente · Anfitrión
          </div>
          <p
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 'clamp(20px, 2.6vw, 26px)',
              lineHeight: 1.4,
              color: '#f3eddd',
              margin: '14px 0 22px',
              minHeight: 96,
            }}
          >
            “{MESSAGES[step]}”
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            {/* puntos de progreso */}
            <div style={{ display: 'flex', gap: 6 }}>
              {MESSAGES.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === step ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i === step ? '#ecd28e' : 'rgba(255,255,255,.18)',
                    transition: 'all .2s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {!last && (
                <button onClick={finish} style={skipBtn}>
                  Saltar
                </button>
              )}
              <button onClick={() => (last ? finish() : setStep((s) => s + 1))} style={nextBtn}>
                {last ? 'Entrar al Círculo' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const nextBtn: React.CSSProperties = {
  padding: '11px 24px',
  borderRadius: 11,
  border: 'none',
  background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)',
  color: '#2c2415',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const skipBtn: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: 11,
  border: 'none',
  background: 'transparent',
  color: 'rgba(232,226,212,.55)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
