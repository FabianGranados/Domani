import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { bootstrapProfile } from '../lib/api';
import { Isologo } from '../components/Isologo';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

export function OnboardingScreen() {
  const { refreshProfile, signOut } = useAuth();
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!age) {
      setError('Debes confirmar tu mayoría de edad (+18).');
      return;
    }
    setBusy(true);
    try {
      await bootstrapProfile(alias.trim(), age);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil');
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
        background: 'radial-gradient(120% 80% at 50% -10%, #181922 0%, #08080a 60%)',
        fontFamily: "'Hanken Grotesk',sans-serif",
        color: '#ece6d6',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))',
          border: '1px solid rgba(201,163,91,.18)',
          borderRadius: 22,
          padding: '40px 34px',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Isologo size={64} />
        <div style={{ fontSize: 11, letterSpacing: '.42em', textTransform: 'uppercase', color: '#9c7a3e', marginTop: 22 }}>
          El último paso
        </div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            lineHeight: 1.1,
            margin: '10px 0 6px',
            color: '#f3eddd',
          }}
        >
          Tu nombre en el Círculo
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(232,226,212,.62)', maxWidth: 330, margin: '0 0 8px' }}>
          Elige el alias con el que te conocerán. Crearemos tu perfil y tu billetera de Aurelios.
        </p>

        <form onSubmit={submit} style={{ width: '100%', marginTop: 14 }}>
          <label style={{ display: 'block', textAlign: 'left', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '8px 0 6px' }}>
            Alias (mínimo 3 caracteres)
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            minLength={3}
            required
            placeholder="Tu nombre de juego"
            style={inputStyle}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              textAlign: 'left',
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'rgba(232,226,212,.78)',
              margin: '18px 0 4px',
              cursor: 'pointer',
            }}
          >
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} style={{ marginTop: 3 }} />
            Confirmo que soy mayor de 18 años y entiendo que los Aurelios son fichas virtuales sin valor monetario.
          </label>

          {error && <p style={{ color: '#ff8a8a', fontSize: 13, marginTop: 10 }}>{error}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '15px',
              borderRadius: 12,
              border: 'none',
              background: GOLD_GRAD,
              color: '#2c2415',
              fontWeight: 700,
              fontSize: 15.5,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
              boxShadow: '0 16px 38px -12px rgba(201,163,91,.55), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            {busy ? 'Creando…' : 'Entrar al Círculo'}
          </button>
        </form>

        <button
          onClick={signOut}
          style={{ marginTop: 18, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(232,226,212,.5)' }}
        >
          Cancelar y salir
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 11,
  color: '#ece6d6',
  fontSize: 15,
  fontFamily: "'Hanken Grotesk',sans-serif",
  outline: 'none',
};
