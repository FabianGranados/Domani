import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { bootstrapProfile, chooseHouse, listHouses, getAvatarMarket, setAvatar, type MarketAvatar } from '../lib/api';
import type { House } from '../lib/types';
import { Isologo } from '../components/Isologo';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

// Foto por ciudad (roma/osaka conservan el nombre de archivo antiguo).
const CITY_IMG: Record<string, string> = {
  bacata: '/assets/casa-bacata.webp', empire: '/assets/casa-empire.webp', plata: '/assets/casa-plata.webp',
  morro: '/assets/casa-morro.webp', roma: '/assets/casa-roma.webp', osaka: '/assets/casa-osaka.webp',
  aztlan: '/assets/casa-aztlan.webp', severia: '/assets/severia.webp',
};
const CITY_ORDER = ['severia', 'bacata', 'empire', 'plata', 'morro', 'roma', 'osaka', 'aztlan'];

type Step = 'alias' | 'city' | 'avatar';

export function OnboardingScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  // Si ya hay perfil (p. ej. usuario antiguo sin ciudad), arranca en 'city'.
  const [step, setStep] = useState<Step>(profile ? 'city' : 'alias');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // paso alias
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState(false);

  // paso ciudad
  const [houses, setHouses] = useState<House[]>([]);
  const [city, setCity] = useState<string | null>(null);

  // paso avatar
  const [avatars, setAvatars] = useState<MarketAvatar[] | null>(null);
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);

  useEffect(() => {
    listHouses().then((hs) => {
      hs.sort((a, b) => CITY_ORDER.indexOf(a.code) - CITY_ORDER.indexOf(b.code));
      setHouses(hs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 'avatar' && !avatars) {
      getAvatarMarket().then((list) => setAvatars(list.filter((a) => a.is_starter && a.image_ready))).catch(() => setAvatars([]));
    }
  }, [step, avatars]);

  async function submitAlias(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!age) { setError('Debes confirmar tu mayoría de edad (+18).'); return; }
    setBusy(true);
    try {
      await bootstrapProfile(alias.trim(), age); // crea perfil (NO refrescamos: seguimos el wizard)
      setStep('city');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCity() {
    if (!city) return;
    setBusy(true); setError(null);
    try {
      await chooseHouse(city);
      setStep('avatar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo elegir la ciudad');
    } finally {
      setBusy(false);
    }
  }

  async function confirmAvatar() {
    if (!pickedAvatar) return;
    setBusy(true); setError(null);
    try {
      await setAvatar(pickedAvatar);
      await refreshProfile(); // ahora sí: el perfil queda completo y entra al Escritorio
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo elegir el avatar');
      setBusy(false);
    }
  }

  return (
    <div style={shell}>
      <div style={{ width: '100%', maxWidth: step === 'alias' ? 440 : 920, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Isologo size={56} />
        <Stepper step={step} />

        {/* ---------- PASO 1 · ALIAS ---------- */}
        {step === 'alias' && (
          <div style={card}>
            <div style={eyebrow}>Paso 1 · Tu identidad</div>
            <h2 style={title}>Tu nombre en el Círculo</h2>
            <p style={lead}>Elige el alias con el que te conocerán. Así se llamará tu avatar.</p>
            <form onSubmit={submitAlias} style={{ width: '100%', marginTop: 14 }}>
              <label style={fieldLabel}>Alias (mínimo 3 caracteres)</label>
              <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} minLength={3} required placeholder="Tu nombre de juego" style={inputStyle} />
              <label style={checkLabel}>
                <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} style={{ marginTop: 3 }} />
                Confirmo que soy mayor de 18 años y entiendo que los Aurelios son fichas virtuales sin valor monetario.
              </label>
              {error && <p style={errText}>{error}</p>}
              <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Creando…' : 'Continuar'}</button>
            </form>
          </div>
        )}

        {/* ---------- PASO 2 · CIUDAD ---------- */}
        {step === 'city' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <div style={eyebrow}>Paso 2 · ¿Dónde vas a vivir?</div>
            <h2 style={title}>Elige tu ciudad</h2>
            <p style={{ ...lead, margin: '0 auto 18px' }}>Tu ciudad es tu bandera y tu especialidad. Cada una reina en un juego distinto.</p>
            <div style={cityGrid}>
              {houses.map((h) => {
                const sel = city === h.code;
                return (
                  <button key={h.id} onClick={() => setCity(h.code)} style={cityCard(sel)}>
                    <div style={cityPhoto(CITY_IMG[h.code] ?? '/assets/casa-bacata.webp')}>
                      <span style={cityRegion}>{h.city}</span>
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <div style={cityName}>{h.name.replace(/^Casa /, '')}</div>
                      <div style={citySpec}>{h.specialty}</div>
                    </div>
                    {sel && <span style={cityCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
            {error && <p style={errText}>{error}</p>}
            <button onClick={confirmCity} disabled={!city || busy} style={{ ...primaryBtn(!city || busy), maxWidth: 360, margin: '20px auto 0' }}>
              {busy ? 'Mudándote…' : city ? `Vivir en ${houses.find((h) => h.code === city)?.name}` : 'Selecciona una ciudad'}
            </button>
          </div>
        )}

        {/* ---------- PASO 3 · AVATAR ---------- */}
        {step === 'avatar' && (
          <div style={{ width: '100%', textAlign: 'center', maxWidth: 600 }}>
            <div style={eyebrow}>Paso 3 · Tu rostro</div>
            <h2 style={title}>Elige tu avatar</h2>
            <p style={{ ...lead, margin: '0 auto 18px' }}>Tu primer avatar es <strong style={{ color: '#7ee0a6' }}>gratis</strong>. Más adelante podrás comprar otros en el Mercado.</p>
            {!avatars ? <p className="muted">Cargando rostros…</p> : (
              <div style={avatarGrid}>
                {avatars.map((a) => {
                  const sel = pickedAvatar === a.code;
                  return (
                    <button key={a.code} onClick={() => setPickedAvatar(a.code)} style={avatarBtn(sel)}>
                      <img src={a.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {sel && <span style={avatarCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {error && <p style={errText}>{error}</p>}
            <button onClick={confirmAvatar} disabled={!pickedAvatar || busy} style={{ ...primaryBtn(!pickedAvatar || busy), maxWidth: 360, margin: '20px auto 0' }}>
              {busy ? 'Entrando…' : 'Entrar a Domani'}
            </button>
          </div>
        )}

        <button onClick={signOut} style={exitBtn}>Cancelar y salir</button>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ['alias', 'city', 'avatar'];
  const idx = order.indexOf(step);
  return (
    <div style={{ display: 'flex', gap: 8, margin: '20px 0 6px' }}>
      {order.map((s, i) => (
        <span key={s} style={{ width: i === idx ? 26 : 8, height: 8, borderRadius: 999, background: i <= idx ? GOLD_GRAD : 'rgba(255,255,255,.14)', transition: 'width .2s' }} />
      ))}
    </div>
  );
}

// ---- estilos ----
const shell: React.CSSProperties = {
  minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '32px 20px',
  background: 'radial-gradient(120% 80% at 50% -10%, #181922 0%, #08080a 60%)',
  fontFamily: "'Hanken Grotesk',sans-serif", color: '#ece6d6',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: 440, background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))',
  border: '1px solid rgba(201,163,91,.18)', borderRadius: 22, padding: '28px 30px 34px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 30px 80px -30px rgba(0,0,0,.8)',
};
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' };
const title: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(30px,5vw,42px)', lineHeight: 1.1, margin: '8px 0 6px', color: '#f3eddd' };
const lead: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.6, color: 'rgba(232,226,212,.62)', maxWidth: 360 };
const fieldLabel: React.CSSProperties = { display: 'block', textAlign: 'left', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '8px 0 6px' };
const checkLabel: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', fontSize: 13.5, lineHeight: 1.5, color: 'rgba(232,226,212,.78)', margin: '18px 0 4px', cursor: 'pointer' };
const errText: React.CSSProperties = { color: '#ff8a8a', fontSize: 13, marginTop: 10 };
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: GOLD_GRAD, color: '#2c2415',
    fontWeight: 700, fontSize: 15.5, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
    boxShadow: '0 16px 38px -12px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.4)',
  };
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 11, color: '#ece6d6', fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif", outline: 'none',
};
const exitBtn: React.CSSProperties = { marginTop: 22, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(232,226,212,.45)' };

// ciudad
const cityGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 };
function cityCard(sel: boolean): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', borderRadius: 16, cursor: 'pointer', textAlign: 'left', padding: 0,
    background: 'rgba(255,255,255,.03)', color: 'inherit', fontFamily: 'inherit',
    border: sel ? '1px solid rgba(201,163,91,.8)' : '1px solid rgba(255,255,255,.09)',
    boxShadow: sel ? '0 16px 40px -18px rgba(201,163,91,.55)' : '0 12px 30px -22px rgba(0,0,0,.8)',
    transform: sel ? 'translateY(-3px)' : 'none', transition: 'transform .15s, border-color .15s',
  };
}
function cityPhoto(img: string): React.CSSProperties {
  return {
    position: 'relative', height: 96, backgroundImage: `linear-gradient(180deg, rgba(8,6,12,.1), rgba(8,6,12,.7)), url('${img}')`,
    backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end',
  };
}
const cityRegion: React.CSSProperties = { fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e7d6a8', padding: '0 12px 8px', textShadow: '0 1px 4px rgba(0,0,0,.8)' };
const cityName: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd' };
const citySpec: React.CSSProperties = { fontSize: 11.5, color: 'rgba(232,226,212,.55)', marginTop: 2 };
const cityCheck: React.CSSProperties = { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', color: '#0b1d12', fontWeight: 800, fontSize: 13 };

// avatar
const avatarGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12 };
function avatarBtn(sel: boolean): React.CSSProperties {
  return {
    position: 'relative', aspectRatio: '1 / 1', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', padding: 0,
    background: 'radial-gradient(120% 120% at 50% 20%, #2a2438, #14111d 75%)',
    border: sel ? '2px solid #7ee0a6' : '1px solid rgba(201,163,91,.25)',
    boxShadow: sel ? '0 0 0 2px rgba(126,224,166,.3)' : 'none', transition: 'border-color .15s',
  };
}
const avatarCheck: React.CSSProperties = { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', color: '#0b1d12', fontWeight: 800, fontSize: 12 };
