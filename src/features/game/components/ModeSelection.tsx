import { motion } from "framer-motion";
import React from "react";
import { Button } from "../../../components/atoms/Button";
import { type GameMode } from "../../../store/useGameStore";
import { useModalStore } from "../../../store/modal";

interface ModeSelectionProps {
  onSelect: (mode: GameMode) => void;
  onClose: () => void;
  currentMode: GameMode;
}

const MODES_CONFIG = [
  {
    id: "identify" as GameMode,
    icon: "🎯",
    title: "FIND ON MAP",
    badge: "CLICK THE MAP",
    description:
      "You are given a Country Name, Flag, or Capital. Your objective is to find and click that country directly on the interactive world map.",
    tip: "Perfect for learning where countries are located in the world. Use Sonar or Reveal if you get stuck.",
  },
  {
    id: "reverse" as GameMode,
    icon: "⚡",
    title: "MULTIPLE CHOICE",
    badge: "REVERSE QUIZ",
    description:
      "A country glows green on the world map. Your objective is to identify which country it is by picking the correct choice from 4 options.",
    tip: "Great for testing your recognition of territory borders, shapes, flags, and capitals.",
  },
];

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  onSelect,
  onClose,
  currentMode,
}) => {
  const [selected, setSelected] = React.useState<GameMode>(currentMode);
  const openModal = useModalStore((state) => state.openModal);

  const handleSelect = (mode: GameMode) => {
    setSelected(mode);
    onSelect(mode);
  };

  const handleExecute = () => {
    openModal("sub-mode", { mode: selected });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] overflow-y-scroll bg-slate-950/95 backdrop-blur-3xl py-8 md:py-16 px-4 md:px-8 pb-32"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center relative">
          {/* Single close button top-right */}
          <div className="absolute top-0 right-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white/70 hover:text-white flex items-center justify-center border border-white/15 hover:border-white/30 active:scale-90 transition-all cursor-pointer shadow-md"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-8 md:mb-14"
          >
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter text-white mb-3 uppercase italic">
              SELECT <span className="text-[var(--color-accent)]">GAME</span> MODE
            </h2>
            <p className="text-[var(--color-text-secondary)] text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase opacity-90">
              Choose how you want to play
            </p>
          </motion.div>

          {/* Mode Cards Grid */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 w-full max-w-4xl">
            {MODES_CONFIG.map((mode, i) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(mode.id)}
                className={`
                  relative p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-2 cursor-pointer transition-all duration-300 overflow-hidden group flex flex-col min-h-[320px] md:min-h-[350px]
                  flex-1 min-w-[280px] max-w-[420px]
                  ${
                    selected === mode.id
                      ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_80px_rgba(56,189,248,0.25)] scale-[1.02]"
                      : "border-white/20 bg-slate-900/80 hover:border-white/40 hover:bg-slate-900"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl md:text-5xl transform group-hover:scale-110 transition-transform duration-300">
                    {mode.icon}
                  </div>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-sky-400 border border-sky-400/30">
                    {mode.badge}
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight uppercase leading-tight">
                  {mode.title}
                </h3>
                <p className="text-slate-300 text-xs md:text-sm mb-6 font-medium leading-relaxed">
                  {mode.description}
                </p>

                <div className="mt-auto pt-4 border-t border-white/10">
                  <span className="text-[var(--color-accent)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] block mb-1">
                    TIP
                  </span>
                  <p className="text-white/80 text-xs font-medium leading-relaxed">
                    {mode.tip}
                  </p>
                </div>

                {selected === mode.id && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute top-5 right-5 w-4 h-4 rounded-full bg-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Action Bar */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-6 inset-x-4 md:inset-x-auto md:right-12 z-[110] flex items-center justify-end gap-3"
      >

        <Button
          size="lg"
          onClick={handleExecute}
          className="flex-1 md:flex-initial px-8 md:px-12 h-14 md:h-18 text-base md:text-xl font-black tracking-widest uppercase rounded-full shadow-[0_20px_80px_-15px_rgba(56,189,248,0.5)] hover:shadow-[0_20px_100px_-10px_rgba(56,189,248,0.7)] transform active:scale-95 transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 text-slate-950 border-2 border-white/30 cursor-pointer"
        >
          <span>START GAME</span>
          <span className="text-xl">→</span>
        </Button>
      </motion.div>
    </>
  );
};
