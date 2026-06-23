import { NavLink } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getWallet } from '../lib/api';
import { Isologo } from './Isologo';

const NAV = [
  { to: '/', label: 'El Salón', end: true },
  { to: '/tessera', label: 'Tessera' },
  { to: '/wallet', label: 'Billetera' },
  { to: '/casino', label: 'El Casino' },
  { to: '/academia', label: 'La Academia' },
  { to: '/lobby', label: 'El Círculo' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
  }, [user]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Isologo size={34} glow={false} />
          <span className="brand sm">DOMANI</span>
        </div>
        <div className="topbar-right">
          <span className="aurelios" title="Aurelios (moneda de fantasía)">
            ⟡ {balance ?? '—'} <span className="muted">Aurelios</span>
          </span>
          <span className="muted">{profile?.alias}</span>
          <button className="link-btn" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <nav className="sidenav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => (isActive ? 'navlink active' : 'navlink')}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">{children}</main>

      <footer className="legal-footer">
        Solo +18 · Los Aurelios son fichas virtuales sin valor monetario. No se compran
        ni se canjean por dinero real.
      </footer>
    </div>
  );
}
