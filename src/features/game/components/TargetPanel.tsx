import { motion } from "framer-motion";
import React from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface TargetPanelProps {
  country: CountryData | undefined;
  feedback: "correct" | "wrong" | null;
  onSkip?: () => void;
  onReveal?: () => void;
  isJustDocked?: boolean;
}

export const TargetPanel: React.FC<TargetPanelProps> = ({
  country,
  feedback,
  onSkip,
  onReveal,
  isJustDocked = false,
}) => {
  const { mode, subMode, triggerPulse, revealed } = useGameStore();

  if (!country) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={
          feedback === "correct"
            ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
            : isJustDocked
            ? {
                scale: [0.94, 1.05, 1],
                borderColor: [
                  "rgba(56,189,248,0.9)",
                  "rgba(56,189,248,0.4)",
                  "rgba(255,255,255,0.1)",
                ],
                boxShadow: [
                  "0 0 35px rgba(56,189,248,0.7)",
                  "0 32px 64px -16px rgba(0,0,0,0.6)",
                ],
                transition: { duration: 0.5, ease: "easeOut" },
              }
            : {}
        }
        className="relative px-4 py-2 rounded-2xl border border-white/10 transition-all duration-300 flex items-center gap-4 bg-slate-900/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* Educational Hint: Reveal official country name for Flags/Capitals (Standard Modes only) */}
        {mode !== 'reverse' && (subMode === 'flag' || subMode === 'capital') && (feedback || revealed) && (
          <motion.div
            initial={{ opacity: 0, x: -15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="absolute right-[105%] top-1/2 -translate-y-1/2 pointer-events-none bg-emerald-500/10 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/20 shadow-2xl z-50 max-w-[280px] sm:max-w-[320px] md:max-w-none"
          >
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight text-emerald-400">
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

          <div className="w-[1px] h-4 bg-white/20"></div>

          {mode === "reverse" ? (
            <button
              onClick={triggerPulse}
              disabled={!!feedback}
              className="text-[10px] font-black uppercase text-white/70 tracking-wide hover:text-sky-400 transition-colors"
            >
              TARGET
            </button>
          ) : (
            <button
              onClick={onReveal}
              disabled={!!feedback || revealed}
              className={`text-[10px] font-black uppercase tracking-wide transition-colors ${
                feedback || revealed
                  ? "text-white/25 cursor-default"
                  : "text-white/75 hover:text-sky-300 cursor-pointer"
              }`}
              title={revealed ? "Target Revealed" : "Reveal Answer"}
            >
              {revealed ? "REVEALED" : "REVEAL"}
            </button>
          )}
        </div>

        {/* Action: Skip */}
        {onSkip && !feedback && (
          <button
            onClick={onSkip}
            className="group/skip flex items-center gap-2 pl-4 border-l border-white/20 hover:opacity-100 transition-opacity"
            title="Skip Mission"
          >
            <span className="text-[10px] font-black text-white/75 group-hover:text-red-400 transition-colors uppercase tracking-wide">
              SKIP
            </span>
            <span className="text-[9px] font-bold text-white/80 bg-white/15 px-1.5 py-0.5 rounded">
              ⌘S
            </span>
          </button>
        )}
      </motion.div>
    </div>
  );
};
