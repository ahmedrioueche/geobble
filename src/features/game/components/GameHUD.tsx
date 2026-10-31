import React from "react";
import { Button } from "../../../components/atoms/Button";
import { getTierRanges } from "../../../data/difficulty-ranking";
import { useGameStore } from "../../../store/useGameStore";
import { formatDuration } from "../../../utils/time";
import {
  DesktopHudStats,
  FullscreenToggle,
  MobileHudStats,
  SubModeSelector,
} from "./GameHudSections";

interface GameHUDProps {
  onStart: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  totalCountries?: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  onStart,
  isFullscreen,
  onToggleFullscreen,
  totalCountries = 0,
}) => {
  const {
    score,
    streak,
    gameStatus,
    subMode,
    setSubMode,
    resetGame,
    challengeType,
    challengeValue,
    timeRemaining,
    totalQuestions,
    correctAttempts,
    totalAttempts,
    startTime,
    difficultyStage,
    totalLevels,
  } = useGameStore();

  const sliceSize = challengeType === "count" ? challengeValue || 30 : 30;
  const currentTierRanges = getTierRanges(sliceSize);
  const currentRange =
    currentTierRanges[difficultyStage - 1] || currentTierRanges[0];
  const currentTierSize =
    challengeType === "world"
      ? totalCountries
      : currentRange?.size || challengeValue;

  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  let progressValue = "-";
  let progressLabel = "MISSION";

  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (gameStatus === "playing" && startTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [gameStatus, startTime]);

  const isTimerMode = challengeType === "timer";
  const displayTime = isTimerMode
    ? formatDuration(timeRemaining, "s")
    : formatDuration(elapsed, "ms");

  if (gameStatus === "playing") {
    if (challengeType === "world") {
      progressValue = `${totalQuestions}/${totalCountries}`;
      progressLabel = "WORLD PREP";
    } else if (challengeType === "count") {
      progressValue = `${totalQuestions}/${currentTierSize}`;
      progressLabel = "TARGETS";
    } else if (challengeType === "timer") {
      progressValue = `${correctAttempts}`;
      progressLabel = "CAPTURED";
    }
  }

  return (
    <header className="fixed top-0 inset-x-0 flex flex-col items-stretch bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-50">
      {/* Row 1: Logo and Stats/Modes/Start */}
      <div className="px-4 py-2 md:px-8 md:py-4 flex justify-between items-center w-full">
        <div className="flex items-center gap-3 md:gap-6 lg:gap-8">
          <button
            onClick={resetGame}
            className="flex items-center gap-2 group hover:opacity-90 transition-all active:scale-95"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="hidden md:block w-8 h-8 md:w-12 md:h-12 mt-1 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            />
            <h1 className="text-xl md:text-2xl md:-mt-1 font-black text-white drop-shadow-sm tracking-tighter leading-none text-left">
              GEOBBLE
            </h1>
          </button>

          {/* Desktop Quit Button when game is active */}
          {gameStatus === "playing" && (
            <button
              onClick={resetGame}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              title="Quit game and return to map"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>QUIT</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-8 lg:gap-12">
          {/* Desktop/Tablet Modes Integration */}
          {gameStatus === "playing" && (
            <div className="hidden lg:block">
              <SubModeSelector subMode={subMode} onSelect={setSubMode} />
            </div>
          )}

          {gameStatus === "playing" ? (
            <>
              <DesktopHudStats
                progressLabel={progressLabel}
                progressValue={progressValue}
                displayTime={displayTime}
                isTimerMode={isTimerMode}
                timeRemaining={timeRemaining}
                difficultyStage={difficultyStage}
                totalLevels={totalLevels}
                score={score}
                accuracy={accuracy}
                streak={streak}
              />
              <FullscreenToggle
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                mobileOnly
              />
            </>
          ) : (
            <div className="flex gap-3 items-center">
              <Button
                onClick={onStart}
                size="sm"
                className="font-black text-xs px-4 py-2 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 shadow-md uppercase tracking-wider"
              >
                START GAME
              </Button>

              <FullscreenToggle
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Tactical Info (Mobile/Tablet Only) */}
      {gameStatus === "playing" && (
        <MobileHudStats
          progressLabel={progressLabel}
          progressValue={progressValue}
          displayTime={displayTime}
          isTimerMode={isTimerMode}
          timeRemaining={timeRemaining}
          difficultyStage={difficultyStage}
          totalLevels={totalLevels}
          score={score}
          accuracy={accuracy}
          streak={streak}
          subMode={subMode}
          onSubModeChange={setSubMode}
        />
      )}
    </header>
  );
};
