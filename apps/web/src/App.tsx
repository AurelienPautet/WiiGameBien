import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "motion/react";
import {
  SocketProvider,
  AuthProvider,
  ModalProvider,
  GameProvider,
  ToastProvider,
  SettingsProvider,
  useGame,
} from "./contexts";
import { QueryProvider } from "./providers/QueryProvider";
import { LandingPage, HomeFooter } from "./components/landing";
import { MenuLayout, OrientationHint, ScaledStage } from "./components/layout";
import { GameCanvas } from "./components/game";
import { MusicController } from "./components/MusicController";
import {
  LevelEditor,
  CampaignEditor,
  LevelsScreen,
  CreationsScreen,
  RankingsScreen,
  AdminDashboard,
} from "./pages";
import { ProtectedAdminRoute } from "./components/admin/ProtectedAdminRoute";

// In-game stage: also owns the theme-cycle (T) shortcut.
const GameView = () => {
  const { cycleTheme } = useGame();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.code === "KeyT") cycleTheme();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleTheme]);

  return (
    <ScaledStage touchAction="none">
      <GameCanvas />
    </ScaledStage>
  );
};

// Route "/": the immersive game stage while playing, otherwise the Home hub.
const MainContent = () => {
  const { isPlaying } = useGame();
  return isPlaying ? (
    <GameView />
  ) : (
    <MenuLayout footer={<HomeFooter />}>
      <LandingPage />
    </MenuLayout>
  );
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MainContent />} />
      <Route
        path="/levels"
        element={
          <MenuLayout>
            <LevelsScreen />
          </MenuLayout>
        }
      />
      <Route
        path="/creations"
        element={
          <MenuLayout>
            <CreationsScreen />
          </MenuLayout>
        }
      />
      <Route
        path="/rankings"
        element={
          <MenuLayout>
            <RankingsScreen />
          </MenuLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <MenuLayout>
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          </MenuLayout>
        }
      />
      <Route
        path="/editor"
        element={
          <MenuLayout contained={false}>
            <ScaledStage embedded>
              <LevelEditor />
            </ScaledStage>
          </MenuLayout>
        }
      />
      <Route
        path="/campaign-editor"
        element={
          <MenuLayout contained={false}>
            <ScaledStage embedded>
              <CampaignEditor />
            </ScaledStage>
          </MenuLayout>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <HashRouter>
      <MotionConfig reducedMotion="user">
        <QueryProvider>
          <SocketProvider>
            <AuthProvider>
              <ToastProvider>
                <ModalProvider>
                  <SettingsProvider>
                    <GameProvider>
                      <MusicController />
                      <AppRouter />
                      {/* App-wide: rotate-to-landscape prompt on portrait touch
                          devices — hard blocker on the stage routes (game and
                          editors), tap-through on the responsive pages. */}
                      <OrientationHint />
                    </GameProvider>
                  </SettingsProvider>
                </ModalProvider>
              </ToastProvider>
            </AuthProvider>
          </SocketProvider>
        </QueryProvider>
      </MotionConfig>
    </HashRouter>
  );
}

export default App;
