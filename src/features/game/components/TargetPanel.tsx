import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CountryData } from '../../../data/country-data';
import { useGameStore } from '../../../store/useGameStore';

interface TargetPanelProps {
  country: CountryData | undefined;
  feedback: 'correct' | 'wrong' | null;
  onSkip?: () => void;
  clickedName?: string | null;
}

export const TargetPanel: React.FC<TargetPanelProps> = ({ 
  country, 
  feedback, 
  onSkip, 
  clickedName 
}) => {
  const { mode } = useGameStore();

  if (!country) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={feedback === 'correct' ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
        className="px-4 py-2 rounded-2xl border border-white/10 transition-all duration-300 flex items-center gap-4 bg-slate-900/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* Data Point: Flag or Text */}
        <div className="flex items-center gap-3">
          {mode === 'flag' ? (
            <img 
              src={`https://flagcdn.com/w80/${country.cca2.toLowerCase()}.png`}
              alt="Target"
              className="h-5 w-auto rounded shadow-sm border border-white/5"
            />
          ) : (
            <span className="text-sm font-black text-white uppercase tracking-tight">
              {mode === 'capital' ? country.capital[0] : country.name}
            </span>
          )}
          
          <div className="w-[1px] h-4 bg-white/10"></div>
          
          <span className="text-[10px] font-black uppercase text-white/40 tracking-wide">
            {mode === 'reverse' ? 'LOCATE' : 'IDENTIFY'}
          </span>
        </div>

        {/* Action: Skip */}
        {onSkip && !feedback && (
          <button
            onClick={onSkip}
            className="group/skip flex items-center gap-2 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity"
            title="Skip Mission"
          >
            <span className="text-[10px] font-black text-white/20 group-hover:text-red-400 transition-colors uppercase tracking-wide">
              SKIP
            </span>
            <span className="text-[9px] font-medium text-white/10 bg-white/5 px-1.5 py-0.5 rounded">
              ⌘S
            </span>
          </button>
        )}
      </motion.div>

      {/* Mistake Correction / Reward Text */}
      <AnimatePresence>
        {feedback === 'wrong' && clickedName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg backdrop-blur-md"
          >
            <span className="text-[10px] font-bold text-red-200 uppercase">
              Clicked: {clickedName}
            </span>
          </motion.div>
        )}
        {feedback === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg backdrop-blur-md"
          >
            <span className="text-[10px] font-bold text-green-200 uppercase">
              STREAK UPDATED +1
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
