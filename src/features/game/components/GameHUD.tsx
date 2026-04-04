import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/Button";
import { StatItem } from "../../../components/molecules/StatItem";
import { useGameStore, type SubMode } from "../../../store/useGameStore";

interface GameHUDProps {
  onStart: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const { score, streak, gameStatus, subMode, setSubMode, resetGame } = useGameStore();

  const modes: SubMode[] = ["name", "flag", "capital"];

  return (
    <header className="fixed top-0 inset-x-0 flex flex-col items-stretch bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-50">
      {/* Row 1: Logo and Stats/Modes/Start */}
      <div className="px-4 py-2 md:px-8 md:py-4 flex justify-between items-center w-full">
        <button onClick={resetGame} className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl md:text-2xl font-black text-white drop-shadow-sm tracking-tight leading-none text-left">
            {t("app.title").toUpperCase()}
          </h1>
        </button>

        <div className="flex items-center gap-4 md:gap-8 lg:gap-12">
          {/* Desktop/Tablet Modes Integration */}
          {gameStatus === "playing" && (
            <div className="hidden sm:flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
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
              <StatItem
                label={t("game.score")}
                value={score.toLocaleString()}
                color="white"
                size="sm"
              />
              <StatItem
                label={t("game.streak")}
                value={streak}
                suffix="×"
                color="var(--color-streak)"
                size="sm"
              />
            </div>
          ) : (
            <Button
              onClick={onStart}
              size="sm"
              className="font-bold text-[10px] bg-white text-slate-950 hover:bg-white/90"
            >
              START MISSION
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Mobile Only Modes */}
      {gameStatus === "playing" && (
        <div className="flex sm:hidden px-4 pb-3 items-center justify-center">
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 w-full justify-around">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setSubMode(m)}
                className={`
                  flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200
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
        </div>
      )}
    </header>
  );
};
