import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Isologo } from '../components/Isologo';

type Mode = 'signin' | 'signup';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.3c-2 1.5-4.6 2.5-7.3 2.5-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 36 43.5 30.5 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  const isSignup = mode === 'signup';

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
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 20,
          left: 24,
          background: 'none',
          border: 'none',
          color: 'rgba(232,226,212,.55)',
          cursor: 'pointer',
          fontFamily: "'Hanken Grotesk',sans-serif",
          fontSize: 13,
        }}
      >
        ← Volver
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))',
          border: '1px solid rgba(201,163,91,.18)',
          borderRadius: 22,
          padding: '40px 34px',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Isologo size={70} />
        <div
          style={{
            fontFamily: 'Marcellus,serif',
            fontSize: 32,
            letterSpacing: '.3em',
            paddingLeft: '.3em',
            color: '#ece6d6',
            marginTop: 22,
          }}
        >
          DOMANI
        </div>
        <div style={{ width: 54, height: 1, background: 'linear-gradient(90deg,transparent,#c9a35b,transparent)', margin: '18px 0' }} />
        <div
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontStyle: 'italic',
            fontSize: 20,
            lineHeight: 1.4,
            textAlign: 'center',
            color: 'rgba(232,226,212,.78)',
            maxWidth: 300,
          }}
        >
          El club privado online para las nuevas élites.
        </div>

        {/* Google */}
        <button
          onClick={google}
          style={{
            width: '100%',
            marginTop: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: '#f6f4ee',
            color: '#1f2024',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        {/* divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '22px 0 6px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          <span style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(232,226,212,.4)' }}>
            o con tu correo
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
        </div>

        <form onSubmit={submit} style={{ width: '100%' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '14px 0 6px' }}>
            Correo
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            autoComplete="email"
            style={inputStyle}
          />

          <label style={{ display: 'block', fontSize: 12, color: '#9c7a3e', letterSpacing: '.08em', margin: '14px 0 6px' }}>
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(232,226,212,.55)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
            >
              {showPass ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-3 4.2M6.1 6.1A18 18 0 0 0 2 12s3 8 10 8a10.9 10.9 0 0 0 4-.7" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <p style={{ color: '#ff8a8a', fontSize: 13, marginTop: 12 }}>{error}</p>}
          {info && <p style={{ color: '#8ae0a8', fontSize: 13, marginTop: 12 }}>{info}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              marginTop: 22,
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
            {busy ? 'Un momento…' : isSignup ? 'Crear mi cuenta' : 'Entrar'}
          </button>
        </form>

        <button
          className="link-btn"
          onClick={() => {
            setMode(isSignup ? 'signin' : 'signup');
            setError(null);
            setInfo(null);
          }}
          style={{ marginTop: 22, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(232,226,212,.72)' }}
        >
          {isSignup ? (
            <>¿Ya eres miembro? <span style={{ color: '#d8b96b', fontWeight: 600 }}>Entrar</span></>
          ) : (
            <>¿Aún no tienes acceso? <span style={{ color: '#d8b96b', fontWeight: 600 }}>Solicítalo</span></>
          )}
        </button>

        <div style={{ fontSize: 11.5, lineHeight: 1.6, textAlign: 'center', color: 'rgba(232,226,212,.4)', marginTop: 24 }}>
          Entretenimiento para mayores de 18 años. Sin apuestas ni premios en dinero real.
        </div>
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
