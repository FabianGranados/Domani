import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { LandingScreen } from './screens/LandingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SalonScreen } from './screens/SalonScreen';
import { EscritorioScreen } from './screens/EscritorioScreen';
import { MichatScreen } from './screens/MichatScreen';
import { DomanibankScreen } from './screens/DomanibankScreen';
import { MillonaureliosScreen } from './screens/MillonaureliosScreen';
import { CasinoScreen } from './screens/CasinoScreen';
import { PokerScreen } from './screens/PokerScreen';
import { AjedrezScreen } from './screens/AjedrezScreen';
import { TesseraScreen } from './screens/TesseraScreen';
import { WalletScreen } from './screens/WalletScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { RouletteScreen } from './screens/RouletteScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { AdminScreen } from './screens/AdminScreen';
import { LaboratorioScreen } from './screens/LaboratorioScreen';
import { PalmaresScreen } from './screens/PalmaresScreen';
import { MensajesScreen } from './screens/MensajesScreen';
import { AjedrezOnlineScreen } from './screens/AjedrezOnlineScreen';
import { IosInstallHint } from './components/IosInstallHint';
import { FloatingMichat } from './components/FloatingMichat';
import { FloatingNav } from './components/FloatingNav';

export default function App() {
  const { loading, session, profile } = useAuth();

  return (
    <>
      <IosInstallHint />
      <AppRoutes loading={loading} session={session} profile={profile} />
      {!loading && session && profile && <FloatingMichat />}
      {!loading && session && profile && <FloatingNav />}
    </>
  );
}

type AppRoutesProps = {
  loading: boolean;
  session: ReturnType<typeof useAuth>['session'];
  profile: ReturnType<typeof useAuth>['profile'];
};

function AppRoutes({ loading, session, profile }: AppRoutesProps) {
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

  // 2. Con sesión pero onboarding incompleto (sin perfil O sin ciudad) -> asistente
  //    (alias +18 -> elegir ciudad -> avatar gratis). La ciudad es obligatoria.
  if (!profile || !profile.house_id) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // 3. Con perfil y ciudad -> app completa
  //    La mesa de póker va FUERA del Layout: es una vista inmersiva a pantalla
  //    completa, sin barra lateral ni pie (eso haría ruido durante el juego).
  return (
    <Routes>
      <Route path="/poker" element={<PokerScreen />} />
      <Route path="/ajedrez" element={<AjedrezScreen />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<EscritorioScreen />} />
              <Route path="/casas" element={<SalonScreen />} />
              <Route path="/michat" element={<MichatScreen />} />
              <Route path="/banco" element={<DomanibankScreen />} />
              <Route path="/millonaurelios" element={<MillonaureliosScreen />} />
              <Route path="/tessera" element={<TesseraScreen />} />
              <Route path="/casino" element={<CasinoScreen />} />
              <Route path="/wallet" element={<WalletScreen />} />
              <Route path="/academia" element={<AcademyScreen />} />
              <Route path="/palmares" element={<PalmaresScreen />} />
              <Route path="/mensajes" element={<MensajesScreen />} />
              <Route path="/ajedrez-online" element={<AjedrezOnlineScreen />} />
              <Route path="/ruleta" element={<RouletteScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              {profile.is_admin && <Route path="/admin" element={<AdminScreen />} />}
              {profile.is_admin && <Route path="/laboratorio" element={<LaboratorioScreen />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
