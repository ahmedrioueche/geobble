import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./components/organisms/LoadingScreen";
import type { CountryData } from "./data/country-data";
import { nameMapping } from "./data/name-mapping";
import { ChoicePanel } from "./features/game/components/ChoicePanel";
import { CountryPopup } from "./features/game/components/CountryPopup";
import { GameHUD } from "./features/game/components/GameHUD";
import { ModeSelection } from "./features/game/components/ModeSelection";
import { TargetPanel } from "./features/game/components/TargetPanel";
import { useGameLogic } from "./features/game/useGameLogic";
import { WorldMap } from "./features/map/WorldMap";
import { useGameStore } from "./store/useGameStore";

function App() {
  const {
    startGame,
    submitAnswer,
    skipQuestion,
    currentCountry,
    countries,
    loading: dataLoading,
  } = useGameLogic();
  const { gameStatus, mode, setMode, choices } = useGameStore();

  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [clickedCountryName, setClickedCountryName] = useState<string | null>(
    null,
  );
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [clickedCountry, setClickedCountry] = useState<CountryData | undefined>(
    undefined,
  );

  // Handle auto-dismiss for exploration and feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
        setClickedCountryName(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (clickedCountry) {
      const timer = setTimeout(() => {
        setClickedCountry(undefined);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clickedCountry]);

  const handleCountryClick = (name: string) => {
    const normalizedName = nameMapping[name] || name;

    if (gameStatus === "playing") {
      if (mode === "reverse") return;

      const isCorrect = submitAnswer(name);
      setClickedCountryName(normalizedName);
      setFeedback(isCorrect ? "correct" : "wrong");
    } else {
      const country = countries.find(
        (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
      );
      setClickedCountry(country);
    }
  };

  const handleChoiceSelect = (choice: string) => {
    const isCorrect = submitAnswer(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => setFeedback(null), 1000);
  };

  const startSequence = () => {
    setShowModeSelect(true);
  };

  const handleFinalStart = () => {
    setShowModeSelect(false);
    startGame();
  };

  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] bg-slate-950 text-white overflow-hidden font-sans selection:bg-sky-500/30">
      <AnimatePresence>
        {showModeSelect && (
          <ModeSelection
            onSelect={(m) => setMode(m)}
            onStart={handleFinalStart}
            onClose={() => setShowModeSelect(false)}
          />
        )}
      </AnimatePresence>

      <GameHUD onStart={startSequence} />

      <main className="flex-1 relative overflow-hidden">
        {/* Deep Field Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020617_100%)]"></div>

        {/* HUD Prompt Area (Floating Overlay) */}
        <div className="absolute top-4 right-4 left-4 md:left-auto z-40 pointer-events-none">
          <div className="flex flex-col items-end gap-3 max-w-full">
            <AnimatePresence mode="wait">
              {gameStatus === "playing" && currentCountry ? (
                <motion.div
                  key={currentCountry.cca3}
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="pointer-events-auto shadow-2xl"
                >
                  <TargetPanel 
                    country={currentCountry} 
                    feedback={feedback} 
                    onSkip={skipQuestion}
                    clickedName={clickedCountryName}
                  />
                </motion.div>
              ) : clickedCountry ? (
                <motion.div
                  key="country-popup"
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="pointer-events-auto shadow-2xl"
                >
                  <CountryPopup
                    country={clickedCountry}
                    onClose={() => setClickedCountry(undefined)}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

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
              mode === "reverse" && gameStatus === "playing"
                ? currentCountry?.cca3
                : null
            }
            countries={countries}
          />
        </div>

        {/* Choice Panel for Reverse Mode */}
        <AnimatePresence>
          {mode === "reverse" && gameStatus === "playing" && (
            <div className="absolute bottom-12 md:bottom-24 left-0 right-0 z-50">
              <ChoicePanel
                choices={choices}
                onChoice={handleChoiceSelect}
                disabled={!!feedback}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Ambient Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(15,23,42,0.4)_80%,rgba(15,23,42,0.8)_100%)]"></div>
      </main>
    </div>
  );
}

export default App;
