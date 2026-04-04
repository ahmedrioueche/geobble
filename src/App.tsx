import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "./components/organisms/LoadingScreen";
import type { CountryData } from "./data/country-data";
import { nameMapping } from "./data/name-mapping";
import { ChoicePanel } from "./features/game/components/ChoicePanel";
import { CountryPopup } from "./features/game/components/CountryPopup";
import { FeedbackPill } from "./features/game/components/FeedbackPill";
import { GameHUD } from "./features/game/components/GameHUD";
import { ModeSelection } from "./features/game/components/ModeSelection";
import { TargetPanel } from "./features/game/components/TargetPanel";
import { useGameLogic } from "./features/game/useGameLogic";
import { WorldMap } from "./features/map/WorldMap";
import { useGameStore } from "./store/useGameStore";

function App() {
  const {
    gameStatus,
    mode,
    subMode,
    setMode,
    choices,
    missionId,
    feedback,
    clickedName,
    revealed,
    setFeedback,
    skipQuestion,
    setRevealed,
    score,
    setScore,
    streak,
    setStreak,
  } = useGameStore();

  const {
    countries,
    loading: dataLoading,
    startGame,
    nextQuestion,
    currentCountry,
  } = useGameLogic();

  const [clickedCountry, setClickedCountry] = useState<CountryData | null>(
    null,
  );
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (clickedCountry) {
      const timer = setTimeout(() => {
        setClickedCountry(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [clickedCountry]);

  const handleCountryClick = useCallback(
    (name: string, code: string) => {
      if (mode !== "identify" || feedback) return;

      // Multi-tiered lookup: cca3 -> ccn3 (numeric) -> name mapping -> raw name
      let countryData = countries.find((c) => c.cca3 === code) || null;
      if (!countryData) {
        countryData = countries.find((c) => c.ccn3 === code) || null;
      }
      if (!countryData) {
        const mappedName = nameMapping[name] || name;
        countryData =
          countries.find(
            (c) => c.name.toLowerCase() === mappedName.toLowerCase(),
          ) || null;
      }

      if (gameStatus === "playing") {
        const targetCountry = currentCountry;
        if (!targetCountry) return;

        const mappedClickedName = nameMapping[name] || name;
        const isCorrect =
          mappedClickedName.toLowerCase() === targetCountry.name.toLowerCase();

        if (isCorrect) {
          if (revealed) {
            nextQuestion();
            return;
          }

          setFeedback("correct", name);
          setScore(score + 10 * (streak + 1));
          setStreak(streak + 1);
          setTimeout(() => {
            nextQuestion();
          }, 1500);
        } else {
          setFeedback("wrong", name);
          setStreak(0);
          setTimeout(() => {
            setFeedback(null, null);
          }, 1500);
        }
      } else {
        setClickedCountry(countryData);
      }
    },
    [
      mode,
      feedback,
      nextQuestion,
      countries,
      gameStatus,
      currentCountry,
      setFeedback,
      score,
      setScore,
      streak,
      setStreak,
      revealed,
    ],
  );

  const handleChoiceSelect = useCallback(
    (choice: string) => {
      if (feedback || !currentCountry) return;

      let isCorrect = false;
      if (subMode === "flag") {
        isCorrect = choice.toLowerCase() === currentCountry.cca2.toLowerCase();
      } else if (subMode === "capital") {
        isCorrect =
          choice.toLowerCase() === currentCountry.capital[0].toLowerCase();
      } else {
        isCorrect = choice.toLowerCase() === currentCountry.name.toLowerCase();
      }

      if (isCorrect) {
        if (revealed) {
          nextQuestion();
          return;
        }

        setFeedback("correct", choice);
        setScore(score + 10 * (streak + 1));
        setStreak(streak + 1);
        setTimeout(() => {
          nextQuestion();
        }, 1500);
      } else {
        setFeedback("wrong", choice);
        setStreak(0);
        setTimeout(() => {
          setFeedback(null, null);
        }, 1500);
      }
    },
    [
      feedback,
      currentCountry,
      subMode,
      nextQuestion,
      setFeedback,
      score,
      setScore,
      streak,
      setStreak,
      revealed,
    ],
  );

  const handleFinalStart = useCallback(() => {
    setShowModeSelect(false);
    startGame();
  }, [startGame]);

  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 text-white overflow-hidden font-sans">
      <AnimatePresence>
        {showModeSelect && (
          <ModeSelection
            onSelect={(m) => setMode(m)}
            onStart={handleFinalStart}
            onClose={() => setShowModeSelect(false)}
          />
        )}
      </AnimatePresence>

      <GameHUD 
        onStart={() => setShowModeSelect(true)} 
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
              console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
          } else {
            document.exitFullscreen();
          }
        }}
      />

      <main className="relative w-full h-full">
        {/* Deep Field Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020617_100%)]"></div>

        {/* HUD Prompt & Choice Area (Floating Overlay) */}
        <div className="absolute top-28 md:top-24 right-4 z-40 pointer-events-none">
          <div className="flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)] md:max-w-full">
            <AnimatePresence mode="wait">
              {gameStatus === "playing" && currentCountry ? (
                <motion.div
                  key={currentCountry.cca3}
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="pointer-events-auto flex flex-col items-end gap-3"
                >
                  <div className="w-full flex flex-col items-end gap-3">
                    <TargetPanel
                      country={currentCountry}
                      feedback={feedback}
                      onSkip={() => skipQuestion(nextQuestion)}
                      onReveal={() => setRevealed(true)}
                    />
                  </div>

                  {mode === "reverse" && (
                    <div className="shadow-2xl rounded-3xl overflow-hidden bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-3 w-fit">
                      <ChoicePanel
                        choices={choices}
                        onChoice={handleChoiceSelect}
                        disabled={!!feedback}
                        countries={countries}
                      />
                    </div>
                  )}

                  <FeedbackPill feedback={feedback} clickedName={clickedName} />
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
                    onClose={() => setClickedCountry(null)}
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
              (revealed || mode === "reverse") && gameStatus === "playing"
                ? currentCountry?.cca3
                : null
            }
            selectedCountryName={
              (revealed || mode === "reverse") && gameStatus === "playing"
                ? currentCountry?.name
                : null
            }
            countries={countries}
            missionId={missionId}
          />
        </div>

        {/* Ambient Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(15,23,42,0.4)_80%,rgba(15,23,42,0.8)_100%)]"></div>
      </main>
    </div>
  );
}

export default App;
