import { motion } from "framer-motion";
import React from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useMapUiStore } from "../../../store/useMapUiStore";
import { useShallow } from "zustand/react/shallow";

interface TargetPanelProps {
  country: CountryData | undefined;
  feedback: "correct" | "wrong" | null;
  onReveal?: () => void;
  isJustDocked?: boolean;
}

export const TargetPanel: React.FC<TargetPanelProps> = ({
  country,
  feedback,
  onReveal,
  isJustDocked = false,
}) => {
  const { mode, pinDirection, subMode, revealed } = useGameStore(
    useShallow((state) => ({
      mode: state.session.mode,
      pinDirection: state.session.pinDirection,
      subMode: state.session.subMode,
      revealed: state.session.revealed,
    })),
  );
  const triggerSonar = useMapUiStore((state) => state.triggerSonar);
  const isPinIdentify = mode === "pin" && pinDirection === "identify";

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
        className="relative px-4 py-2 md:px-7 md:py-4 rounded-2xl border border-white/10 transition-all duration-300 flex items-center gap-4 md:gap-6 bg-slate-900/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* Educational Hint: Reveal official country name for Flags/Capitals (Standard Modes only) */}
        {mode !== 'reverse' && !isPinIdentify && (subMode === 'flag' || subMode === 'capital') && (feedback || revealed) && (
          <motion.div
            initial={{ opacity: 0, x: -15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="absolute right-[105%] top-1/2 -translate-y-1/2 pointer-events-none bg-emerald-500/10 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/20 shadow-2xl z-50 w-max"
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight text-emerald-400 whitespace-nowrap">
                {country.name}
              </span>
            </div>
          </motion.div>
        )}
        {/* Data Point: Flag or Text */}
        <div className="flex items-center gap-3 md:gap-5">
          {mode === "reverse" ? (
            // Single SONAR button — pans camera to target and fires rings
            <button
              onClick={triggerSonar}
              disabled={!!feedback}
              className={`flex items-center gap-1.5 text-sm md:text-base font-black uppercase tracking-tight transition-colors ${
                feedback ? "text-white/30 cursor-default" : "text-sky-300 hover:text-sky-200 cursor-pointer"
              }`}
              title="Pan map to target and fire sonar"
            >
              <span>🔍</span>
              <span>FIND ON MAP</span>
            </button>
          ) : isPinIdentify ? (
            <span className="text-sm md:text-xl font-black text-sky-300 uppercase tracking-tight">
              IDENTIFY PIN
            </span>
          ) : subMode === "flag" ? (
            <img
              src={`https://flagcdn.com/w160/${country.cca2.toLowerCase()}.png`}
              alt="Target"
              className="h-5 md:h-10 w-auto rounded md:rounded-md shadow-sm border border-white/5"
            />
          ) : (
            <span className="text-sm md:text-xl font-black text-white uppercase tracking-tight">
              {subMode === "capital" ? country.capital[0] : country.name}
            </span>
          )}

          <div className="w-[1px] h-4 md:h-7 bg-white/20"></div>

          {mode !== "reverse" && !isPinIdentify && (
            <button
              onClick={onReveal}
              disabled={!!feedback || revealed}
              className={`text-[10px] md:text-sm font-black uppercase tracking-wide transition-colors ${
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

      </motion.div>
    </div>
  );
};
