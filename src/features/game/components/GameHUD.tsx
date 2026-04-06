import React from "react";
import { Button } from "../../../components/atoms/Button";
import { StatItem } from "../../../components/molecules/StatItem";
import { useGameStore, type SubMode } from "../../../store/useGameStore";

interface GameHUDProps {
  onStart: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  totalCountries?: number;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

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
  } = useGameStore();

  const modes: SubMode[] = ["name", "flag", "capital"];

  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  let progressValue = "-";
  let progressLabel = "MISSION";

  if (gameStatus === "playing") {
    if (challengeType === "world") {
      progressValue = `${totalQuestions}/${totalCountries}`;
      progressLabel = "WORLD PREP";
    } else if (challengeType === "count") {
      progressValue = `${totalQuestions}/${challengeValue}`;
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
        <button
          onClick={resetGame}
          className="hover:opacity-80 transition-opacity"
        >
          <h1 className="text-xl md:text-2xl font-black text-white drop-shadow-sm tracking-tight leading-none text-left">
            GEOBBLE
          </h1>
        </button>

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
            <div className="flex gap-4 md:gap-8 items-center">
              {/* Mission Progress - Hidden on very small screens, visible on md+ */}
              <div className="hidden md:block">
                <StatItem
                  label={progressLabel}
                  value={progressValue}
                  color="var(--color-primary)"
                  size="sm"
                />
              </div>

              {/* Timer - Special visibility for timer mode */}
              {challengeType === "timer" && (
                <StatItem
                  label="TIME"
                  value={formatTime(timeRemaining)}
                  color={timeRemaining < 10 ? "#ef4444" : "white"}
                  size="sm"
                />
              )}

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
