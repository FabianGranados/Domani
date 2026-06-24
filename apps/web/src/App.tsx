import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { LandingScreen } from './screens/LandingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SalonScreen } from './screens/SalonScreen';
import { CasinoScreen } from './screens/CasinoScreen';
import { PokerScreen } from './screens/PokerScreen';
import { TesseraScreen } from './screens/TesseraScreen';
import { WalletScreen } from './screens/WalletScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { RouletteScreen } from './screens/RouletteScreen';
import { LobbyScreen } from './screens/LobbyScreen';

export default function App() {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-coin">
          <img src="/assets/aurelio-coin.webp" alt="DOMANI" />
        </div>
        <p className="muted">Abriendo las puertas del Círculo…</p>
      </div>
    );
  }

  // 1. Sin sesión -> landing pública (/) + login (/login)
  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 2. Con sesión pero sin perfil -> onboarding (+18 + alias)
  if (!profile) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // 3. Con perfil -> app completa (la Casa se elige dentro del Salón, no es obligatoria)
  //    La mesa de póker va FUERA del Layout: es una vista inmersiva a pantalla
  //    completa, sin barra lateral ni pie (eso haría ruido durante el juego).
  return (
    <Routes>
      <Route path="/poker" element={<PokerScreen />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<SalonScreen />} />
              <Route path="/tessera" element={<TesseraScreen />} />
              <Route path="/casino" element={<CasinoScreen />} />
              <Route path="/wallet" element={<WalletScreen />} />
              <Route path="/academia" element={<AcademyScreen />} />
              <Route path="/ruleta" element={<RouletteScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
