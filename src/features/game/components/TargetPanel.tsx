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
  const { mode, subMode, triggerPulse, revealed } = useGameStore();

  if (!country) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={
          feedback === "correct"
            ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
            : {}
        }
        className="relative px-4 py-2 rounded-2xl border border-white/10 transition-all duration-300 flex items-center gap-4 bg-slate-900/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* Educational Hint: Reveal official country name for Flags/Capitals (Standard Modes only) */}
        {mode !== 'reverse' && (subMode === 'flag' || subMode === 'capital') && (feedback || revealed) && (
          <motion.div
            initial={{ opacity: 0, x: -15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="absolute right-[105%] top-1/2 -translate-y-1/2 pointer-events-none bg-emerald-500/10 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/20 shadow-2xl z-50 max-w-[150px] sm:max-w-[200px] md:max-w-none overflow-hidden"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] truncate text-emerald-400">
                {country.name}
              </span>
            </div>
          </motion.div>
        )}
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
