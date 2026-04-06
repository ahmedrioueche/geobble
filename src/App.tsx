import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./components/organisms/LoadingScreen";
import { GameHUD } from "./features/game/components/GameHUD";
import { GlobalOverlays } from "./features/game/components/GlobalOverlays";
import { ModeSelection } from "./features/game/components/ModeSelection";
import { TacticalInterface } from "./features/game/components/TacticalInterface";
import { useAppActions } from "./features/game/hooks/useAppActions";
import { useGameLogic } from "./features/game/useGameLogic";
import { WorldMap } from "./features/map/WorldMap";
import { useFullscreen } from "./hooks/useFullscreen";
import Modals from "./modals";
import { useGameStore } from "./store/useGameStore";

function App() {
  const { setMode, setRevealed } = useGameStore();
  const { loading: dataLoading } = useGameLogic();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showModeSelect, setShowModeSelect] = useState(false);

  const {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
    handleFinalStart,
    gameStatus,
    mode,
    skipQuestion,
    currentCountry,
    countries,
    missionId,
  } = useAppActions();

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
            onSelect={(m) => setMode(m)}
            onClose={() => setShowModeSelect(false)}
          />
        )}
      </AnimatePresence>

      <GameHUD
        onStart={() => setShowModeSelect(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        totalCountries={countries.length}
      />

      <main className="relative w-full h-full">
        {/* Deep Field Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020617_100%)]"></div>

        <TacticalInterface
          currentCountry={currentCountry}
          countries={countries}
          onChoiceSelect={handleChoiceSelect}
          onSkip={skipQuestion}
          onReveal={() => setRevealed(true)}
        />

        {/* Map Container - Full Viewport Filling */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-1000 transform ${
            gameStatus === "playing"
              ? "grayscale-[0.4] brightness-75 scale-100"
              : "grayscale-0 scale-105"
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
    </div>
  );
}

export default App;
