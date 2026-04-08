import React from "react";
import { Button } from "../../../components/atoms/Button";
import { StatItem } from "../../../components/molecules/StatItem";
import { getMaxLevels, getTierRanges } from "../../../data/difficulty-ranking";
import { useGameStore, type SubMode } from "../../../store/useGameStore";
import { formatDuration } from "../../../utils/time";

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
  } = useGameStore();

  const modes: SubMode[] = ["name", "flag", "capital"];

  const maxLevels = getMaxLevels(
    challengeType === "count" ? challengeValue : 30,
  );

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
    let interval: any;
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
        </div>

        <div className="flex items-center gap-3 md:gap-8 lg:gap-12">
          {/* Desktop/Tablet Modes Integration */}
          {gameStatus === "playing" && (
            <div className="hidden lg:flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setSubMode(m)}
                  className={`
                    px-3 lg:px-5 py-1 rounded-lg text-[9px] lg:text-[10px] font-bold uppercase transition-all duration-200
                    ${
                      subMode === m
                        ? "bg-white text-slate-950 shadow-lg"
                        : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    }
                  `}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {gameStatus === "playing" ? (
            <div className="flex gap-3 md:gap-8 items-center">
              {/* Mission Progress - Hidden on very small screens, visible on md+ */}
              <div className="hidden md:block">
                <StatItem
                  label={progressLabel}
                  value={progressValue}
                  color="var(--color-primary)"
                  size="sm"
                />
              </div>

              {/* Mission Timer/Stopwatch - Hidden on mobile, visible on tablet+ */}
              <div className="hidden md:block">
                <StatItem
                  label="TIME"
                  value={displayTime}
                  color={
                    isTimerMode && timeRemaining < 10 ? "#ef4444" : "white"
                  }
                  size="sm"
                />
              </div>

              {/* MISSION LEVEL */}
              <div className="flex">
                <StatItem
                  label="LEVEL"
                  value={`${difficultyStage}/${maxLevels}`}
                  color="var(--color-primary)"
                  size="sm"
                />
              </div>

              {/* Core Stats */}
              <StatItem
                label="SCORE"
                value={score.toLocaleString()}
                color="white"
                size="sm"
              />

              <div className="hidden sm:block">
                <StatItem
                  label="ACCURACY"
                  value={accuracy}
                  suffix="%"
                  color="var(--color-accent)"
                  size="sm"
                />
              </div>

              <StatItem
                label="STREAK"
                value={streak}
                suffix="×"
                color="var(--color-streak)"
                size="sm"
              />

              {/* Fullscreen Toggle (Mobile Only) */}
              <button
                onClick={onToggleFullscreen}
                className="flex sm:hidden w-8 h-8 rounded-lg bg-white/5 items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isFullscreen ? (
                    <>
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </>
                  ) : (
                    <>
                      <path d="M15 3h6v6" />
                      <path d="M9 21H3v-6" />
                      <path d="M21 3l-7 7" />
                      <path d="M3 21l7-7" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <Button
                onClick={onStart}
                size="sm"
                className="font-bold text-[10px] bg-white text-slate-950 hover:bg-white/90"
              >
                START MISSION
              </Button>

              <button
                onClick={onToggleFullscreen}
                className="flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {!isFullscreen ? (
                    <>
                      <path d="M15 3h6v6" />
                      <path d="M9 21H3v-6" />
                      <path d="M21 3l-7 7" />
                      <path d="M3 21l7-7" />
                    </>
                  ) : (
                    <>
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Tactical Info (Mobile/Tablet Only) */}
      {gameStatus === "playing" && (
        <div className="flex flex-col gap-2 px-4 pb-3 md:hidden">
          <div className="flex justify-between items-center border-t border-white/5 pt-2">
            <div className="flex gap-4">
              <StatItem
                label={progressLabel}
                value={progressValue}
                color="var(--color-primary)"
                size="sm"
              />
              <StatItem
                label="ACCURACY"
                value={accuracy}
                suffix="%"
                color="var(--color-accent)"
                size="sm"
              />
              <StatItem
                label="TIME"
                value={displayTime}
                color={isTimerMode && timeRemaining < 10 ? "#ef4444" : "white"}
                size="sm"
              />
            </div>

            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 gap-1">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setSubMode(m)}
                  className={`
                    px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200
                    ${
                      subMode === m
                        ? "bg-white text-slate-950 shadow-lg"
                        : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    }
                  `}
                >
                  {m[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
