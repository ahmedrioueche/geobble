import { motion } from "framer-motion";
import React from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface TargetPanelProps {
  country: CountryData | undefined;
  feedback: "correct" | "wrong" | null;
  onSkip?: () => void;
  onReveal?: () => void;
}

export const TargetPanel: React.FC<TargetPanelProps> = ({
  country,
  feedback,
  onSkip,
  onReveal,
}) => {
  const { mode, subMode, triggerPulse } = useGameStore();

  if (!country) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={
          feedback === "correct"
            ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
            : {}
        }
        className="px-4 py-2 rounded-2xl border border-white/10 transition-all duration-300 flex items-center gap-4 bg-slate-900/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* Data Point: Flag or Text */}
        <div className="flex items-center gap-3">
          {mode === "reverse" ? (
            <button
              onClick={triggerPulse}
              disabled={!!feedback}
              className="text-sm font-black text-white uppercase tracking-tight hover:text-sky-400 transition-colors"
            >
              IDENTIFY TERRITORY
            </button>
          ) : subMode === "flag" ? (
            <img
              src={`https://flagcdn.com/w80/${country.cca2.toLowerCase()}.png`}
              alt="Target"
              className="h-5 w-auto rounded shadow-sm border border-white/5"
            />
          ) : (
            <button
              onClick={triggerPulse}
              disabled={!!feedback}
              className="text-sm font-black text-white uppercase tracking-tight hover:text-sky-400 transition-colors"
            >
              {subMode === "capital" ? country.capital[0] : country.name}
            </button>
          )}

          <div className="w-[1px] h-4 bg-white/10"></div>

          {mode === "reverse" ? (
            <button
              onClick={triggerPulse}
              disabled={!!feedback}
              className="text-[10px] font-black uppercase text-white/40 tracking-wide hover:text-sky-400 transition-colors"
            >
              TARGET
            </button>
          ) : (
            <button
              onClick={onReveal}
              disabled={!!feedback}
              className={`text-[10px] font-black uppercase tracking-wide transition-colors ${
                feedback
                  ? "text-white/20 cursor-default"
                  : "text-white/40 hover:text-blue-400 cursor-pointer"
              }`}
              title="Reveal Answer"
            >
              REVEAL
            </button>
          )}
        </div>

        {/* Action: Skip */}
        {onSkip && !feedback && (
          <button
            onClick={onSkip}
            className="group/skip flex items-center gap-2 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity"
            title="Skip Mission"
          >
            <span className="text-[10px] font-black text-white/50 group-hover:text-red-400 transition-colors uppercase tracking-wide">
              SKIP
            </span>
            <span className="text-[9px] font-medium text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
              ⌘S
            </span>
          </button>
        )}
      </motion.div>
    </div>
  );
};
