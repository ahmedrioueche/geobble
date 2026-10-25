import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./components/organisms/LoadingScreen";
import { GameHUD } from "./features/game/components/GameHUD";
import { GlobalOverlays } from "./features/game/components/GlobalOverlays";
import { ModeSelection } from "./features/game/components/ModeSelection";
import { TacticalInterface } from "./features/game/components/TacticalInterface";
import { useAppActions } from "./features/game/hooks/useAppActions";
import { WorldMap } from "./features/map/WorldMap";
import { useFullscreen } from "./hooks/useFullscreen";
import Modals from "./modals";
import { useGameStore } from "./store/useGameStore";

function App() {
  const { setMode } = useGameStore();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showModeSelect, setShowModeSelect] = useState(false);

  const {
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

      {/* Bottom-left Start Game Hero Button (desktop only) */}
      <AnimatePresence>
        {gameStatus === "idle" && !showModeSelect && (
          <motion.div
            initial={{ opacity: 0, x: -20, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed bottom-8 left-8 hidden md:flex flex-col items-start gap-2 pointer-events-none z-30"
          >
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              <button
                onClick={() => setShowModeSelect(true)}
                className="group relative flex items-center gap-3 px-7 py-4 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-slate-950 font-black text-xl rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.45)] hover:shadow-[0_0_70px_rgba(56,189,248,0.7)] transition-all transform hover:scale-105 active:scale-95 border-2 border-white/30 uppercase tracking-wider cursor-pointer"
              >
                <svg
                  className="w-6 h-6 fill-current transition-transform group-hover:scale-110"
                  viewBox="0 0 24 24"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                <span>START GAME</span>
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 px-1">
                Choose a mode &amp; test your skills
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}

export default App;
