import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackPillProps {
  feedback: "correct" | "wrong" | null;
  clickedName: string | null;
  subMode?: string;
  countries?: any[];
}

const PRAISE_MESSAGES = [
  "EXCELLENT!",
  "GEOGRAPHIC GENIUS!",
  "MISSION ACCREDITED!",
  "SURGICAL PRECISION!",
  "OPERATIONAL SUCCESS!",
  "PERFECT INTEL!"
];

export const FeedbackPill: React.FC<FeedbackPillProps> = ({ feedback, clickedName, subMode, countries }) => {
  const displayClickedName = React.useMemo(() => {
    if (!clickedName) return "";
    if (subMode === 'flag' && countries) {
      const country = countries.find(c => c.cca2.toLowerCase() === clickedName.toLowerCase());
      return country ? country.name : clickedName;
    }
    return clickedName;
  }, [clickedName, subMode, countries]);

  const praise = React.useMemo(() => 
    PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)], 
    [feedback]
  );

  return (
    <AnimatePresence mode="wait">
      {feedback === 'wrong' && clickedName && (
        <motion.div
          key="wrong-feedback"
          initial={{ opacity: 0, scale: 0.9, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: "auto" }}
          exit={{ opacity: 0, scale: 0.9, height: 0 }}
          className="w-full flex justify-center"
        >
          <div className="bg-red-500/20 border border-red-500/40 px-5 py-2 rounded-2xl backdrop-blur-xl shadow-2xl mt-2 max-w-[90vw] overflow-hidden">
            <span className="text-xs font-black text-red-200 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap truncate text-center justify-center">
              <span className="text-sm shrink-0">⚠️</span> INCORRECT: {displayClickedName.toUpperCase()}
            </span>
          </div>
        </motion.div>
      )}
      {feedback === 'correct' && (
        <motion.div
          key="correct-feedback"
          initial={{ opacity: 0, scale: 0.9, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: "auto" }}
          exit={{ opacity: 0, scale: 0.9, height: 0 }}
          className="w-full flex justify-center"
        >
          <div className="bg-emerald-500/20 border border-emerald-500/40 px-5 py-2 rounded-2xl backdrop-blur-xl shadow-2xl mt-2 max-w-[90vw]">
            <span className="text-xs font-black text-emerald-200 uppercase tracking-widest flex items-center gap-2 whitespace-normal text-center justify-center">
              <span className="text-sm shrink-0">✨</span> {praise} +1 STREAK
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
