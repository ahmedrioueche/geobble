import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../../store/useGameStore";

export const StreakLostToast: React.FC = () => {
  const { streakLost, setStreakLost } = useGameStore();

  useEffect(() => {
    if (streakLost !== null) {
      const timer = setTimeout(() => {
        setStreakLost(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [streakLost, setStreakLost]);

  return (
    <AnimatePresence mode="wait">
      {streakLost !== null && (
        <motion.div
          key="streak-lost-toast"
          initial={{ opacity: 0, y: 100, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 50, x: "-50%", scale: 0.95 }}
          className="fixed bottom-8 left-1/2 z-[100] px-6 py-4 rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-red-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(239,68,68,0.1)] flex items-center gap-4 min-w-[280px] max-w-[90vw]"
        >
          {/* Decorative side bar */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl shadow-inner border border-red-500/20">
             ⚠️
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black tracking-[0.2em] text-red-400 uppercase opacity-70">
              Streak Terminal
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-white tracking-tight uppercase">
                Lost
              </span>
              <span className="text-2xl font-black text-red-500 leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                {streakLost}
              </span>
              <span className="text-xs font-black text-white/60 tracking-wider uppercase">
                Territories
              </span>
            </div>
          </div>

          <button 
            onClick={() => setStreakLost(null)}
            className="ml-auto p-2 text-white/20 hover:text-white/60 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
