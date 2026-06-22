import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HouseSelectScreen } from './screens/HouseSelectScreen';
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
        <h1 className="brand">DOMANI</h1>
        <p className="muted">Abriendo las puertas del Círculo…</p>
      </div>
    );
  }

  // 1. Sin sesión -> login / registro
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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

  // 3. Con perfil pero sin Casa -> elección de Casa
  if (!profile.house_id) {
    return (
      <Routes>
        <Route path="/casa" element={<HouseSelectScreen />} />
        <Route path="*" element={<Navigate to="/casa" replace />} />
      </Routes>
    );
  }

  // 4. App completa
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TesseraScreen />} />
        <Route path="/wallet" element={<WalletScreen />} />
        <Route path="/academia" element={<AcademyScreen />} />
        <Route path="/ruleta" element={<RouletteScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
