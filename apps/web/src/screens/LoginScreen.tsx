import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'signup' && !age) {
      setError('Debes confirmar que eres mayor de 18 años.');
      return;
    }
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

  return (
    <div className="center-wrap">
      <div className="card">
        <h1 className="brand" style={{ textAlign: 'center', fontSize: '2.4rem' }}>
          DOMANI
        </h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
          El Círculo te espera. Solo +18.
        </p>

        <form onSubmit={submit}>
          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {mode === 'signup' && (
            <div className="checkbox-row">
              <input
                id="age"
                type="checkbox"
                checked={age}
                onChange={(e) => setAge(e.target.checked)}
              />
              <label htmlFor="age" style={{ margin: 0 }}>
                Confirmo que soy mayor de 18 años y entiendo que los Aurelios son
                una moneda de fantasía sin valor monetario.
              </label>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {info && <p className="ok">{info}</p>}

          <button className="btn" disabled={busy}>
            {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button className="btn secondary" onClick={google} style={{ marginTop: '0.8rem' }}>
          Continuar con Google
        </button>

        <p className="muted" style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          {mode === 'signin' ? '¿No tienes cuenta?' : '¿Ya eres miembro?'}{' '}
          <button
            className="link-btn"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
