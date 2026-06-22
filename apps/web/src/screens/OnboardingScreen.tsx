import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { bootstrapProfile } from '../lib/api';

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
    <div className="center-wrap">
      <div className="card">
        <h2>Tu nombre en el Círculo</h2>
        <p className="muted">
          Elige el alias con el que te conocerán. Crearemos tu perfil y tu billetera de
          Aurelios vacía.
        </p>
        <form onSubmit={submit}>
          <label>Alias (mínimo 3 caracteres)</label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            minLength={3}
            required
          />
          <div className="checkbox-row">
            <input
              id="age2"
              type="checkbox"
              checked={age}
              onChange={(e) => setAge(e.target.checked)}
            />
            <label htmlFor="age2" style={{ margin: 0 }}>
              Confirmo que soy mayor de 18 años.
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>
            Entrar al Círculo
          </button>
        </form>
        <button className="link-btn" onClick={signOut} style={{ marginTop: '1rem' }}>
          Cancelar y salir
        </button>
      </div>
    </div>
  );
}
