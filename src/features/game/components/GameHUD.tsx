import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/Button";
import { StatItem } from "../../../components/molecules/StatItem";
import { useGameStore, type GameMode } from "../../../store/useGameStore";

interface GameHUDProps {
  onStart: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const { score, streak, gameStatus, mode, setMode } = useGameStore();

  const modes: GameMode[] = ["name", "flag", "capital"];

  return (
    <header className="p-3 md:p-4 flex flex-wrap justify-between items-center bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-50">
      <div className="flex items-center gap-4 md:gap-10">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-3xl font-black text-white drop-shadow-sm tracking-tight leading-none">
            {t("app.title").toUpperCase()}
          </h1>
          <p className="hidden md:block text-white/40 text-[9px] font-bold uppercase tracking-tight mt-1 ml-0.5">
            {t("app.tagline")}
          </p>
        </div>

        {gameStatus === "playing" && (mode === 'name' || mode === 'flag' || mode === 'capital') && (
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`
                    px-3 md:px-5 py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase transition-all duration-200
                    ${
                      mode === m
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
      </div>

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
        <div className="flex gap-2">
          <Button
            onClick={onStart}
            size="sm"
            className="font-bold text-[10px] bg-white text-slate-950 hover:bg-white/90"
          >
            START MISSION
          </Button>
        </div>
      )}
    </header>
  );
};
