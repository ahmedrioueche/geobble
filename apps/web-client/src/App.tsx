import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "./components/organisms/LoadingScreen";
import { GameHUD } from "./features/game/components/GameHUD";
import { GlobalOverlays } from "./features/game/components/GlobalOverlays";
import { ModeSelection } from "./features/game/components/ModeSelection";
import { TacticalInterface } from "./features/game/components/TacticalInterface";
import { useAppActions } from "./features/game/application/hooks/useAppActions";
import { WorldMap } from "./features/map/WorldMap";
import { useFullscreen } from "./hooks/useFullscreen";
import { useSavedGameSession } from "./features/game/application/hooks/useSavedGameSession";
import { MultiplayerExperience } from "./features/multiplayer/presentation/MultiplayerExperience";
import Modals from "./modals";

function App() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showModeSelect, setShowModeSelect] = useState(false);
  const {
    savedSession,
    resumeError,
    resumeSession,
    retrySave,
  } = useSavedGameSession();

  const {
    clock,
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
    handleFinalStart,
    handleReveal,
    gameStatus,
    mode,
    currentCountry,
    countries,
    missionId,
    loading: dataLoading,
  } = useAppActions();

  const handleResume = useCallback(() => {
    resumeSession();
    setShowModeSelect(false);
  }, [resumeSession]);

  useEffect(() => {
    const handleMissionStart = () => {
      handleFinalStart();
      setShowModeSelect(false);
    };

    window.addEventListener("game:start-mission", handleMissionStart);
    return () =>
      window.removeEventListener("game:start-mission", handleMissionStart);
  }, [handleFinalStart]);

  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative w-full h-[100dvh] -mt-5 bg-slate-950 text-white overflow-hidden font-sans">
      <Modals />
      <AnimatePresence>
        {showModeSelect && (
          <ModeSelection
            currentMode={mode}
            onClose={() => setShowModeSelect(false)}
            savedSession={savedSession}
            onResume={handleResume}
            onRetrySave={retrySave}
            resumeError={resumeError}
          />
        )}
      </AnimatePresence>

      <GameHUD
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        totalCountries={countries.length}
        clock={clock}
      />

      <main className="relative w-full h-full">
        {/* Deep Field Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#111e33_0%,#080f1d_100%)]"></div>

        <TacticalInterface
          currentCountry={currentCountry}
          countries={countries}
          onChoiceSelect={handleChoiceSelect}
          onReveal={handleReveal}
        />

        {/* Map Container - Full Viewport Filling */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-1000 transform ${gameStatus === "playing"
            ? "brightness-105 contrast-105 saturate-110 scale-100"
            : "brightness-100 scale-105"
            }`}
        >
          <WorldMap
            onCountryClick={handleCountryClick}
            selectedCountryCode={
              gameStatus === "playing"
                ? currentCountry?.cca3
                : clickedCountry?.cca3
            }
            countries={countries}
            missionId={missionId}
          />
        </div>

        <GlobalOverlays
          clickedCountry={clickedCountry}
          onClosePopup={() => setClickedCountry(null)}
        />
      </main>
      <MultiplayerExperience
        countries={countries}
        onPlayOffline={() => setShowModeSelect(true)}
        showHomeActions={gameStatus === "idle" && !showModeSelect}
      />
    </div>
  );
}

export default App;
