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
    title: "IDENTIFY MISSION",
    description: "Identify territory from multiple-choice intel. Switch between Name, Flag, and Capital sub-modes during active gameplay.",
    tip: "Flexible operational parameters. Perfect for balanced training."
  },
  {
    id: "reverse" as GameMode,
    icon: "⚡",
    title: "REVERSE OPS",
    description: "Target location highlighted on the map. Identify the territory's Name, Flag, or Capital from tactical multiple-choice data.",
    tip: "Elite mission. Requires visual recognition of territory shapes and location."
  }
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
        className="fixed inset-0 z-[100] overflow-y-scroll bg-slate-950/95 backdrop-blur-3xl py-12 md:py-20 px-4 md:px-8 pb-32"
      >
        <div className="max-w-6xl mx-auto flex flex-col items-center relative">
          {/* Dismiss Button */}
          <button
            onClick={onClose}
            className="absolute -top-4 md:-top-10 right-0 p-4 text-white/40 hover:text-white transition-all transform hover:rotate-90"
            title="Back to Map"
          >
            <span className="text-4xl font-black">×</span>
          </button>

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-12 md:mb-20"
          >
            <h2 className="text-3xl md:text-7xl font-black tracking-tighter text-white mb-4 uppercase italic">
              SELECT <span className="text-[var(--color-accent)]">MISSION</span> MODE
            </h2>
            <p className="text-[var(--color-text-secondary)] text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase opacity-40">
              Define your operational parameters
            </p>
          </motion.div>

          {/* Centered Grid for 2 items on desktop */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 w-full max-w-4xl">
            {MODES_CONFIG.map((mode, i) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(mode.id)}
                className={`
                  relative p-6 md:p-8 rounded-[40px] border-2 cursor-pointer transition-all duration-500 overflow-hidden group flex flex-col min-h-[300px] md:min-h-[320px]
                  flex-1 min-w-[280px] max-w-[400px]
                  ${
                    selected === mode.id
                      ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_100px_rgba(56,189,248,0.15)] scale-[1.02]"
                      : "border-white/5 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80"
                  }
                `}
              >
                <div className="text-5xl md:text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{mode.icon}</div>
                <h3 className="text-xl md:text-3xl font-black text-white mb-3 tracking-tighter uppercase leading-tight">
                  {mode.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-xs md:text-base mb-8 font-medium leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                  {mode.description}
                </p>

                <div className="mt-auto pt-6 border-t border-white/10">
                  <span className="text-[var(--color-accent)] text-[10px] font-black uppercase tracking-[0.2em] opacity-50 block mb-2">
                    TACTICAL TIP
                  </span>
                  <p className="text-white text-xs font-bold leading-relaxed">
                    {mode.tip}
                  </p>
                </div>

                {selected === mode.id && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute top-6 right-6 w-5 h-5 rounded-full bg-[var(--color-accent)] shadow-[0_0_20px_var(--color-accent)]"
                  />
                )}
                
                {/* Scanline effect for selected */}
                {selected === mode.id && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[var(--color-accent)]/5 to-transparent h-1/2 w-full animate-pulse opacity-20" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Execute Action */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-[110]"
      >
        <Button 
          size="lg" 
          onClick={handleExecute} 
          className="px-8 md:px-12 h-16 md:h-20 text-lg md:text-2xl font-black tracking-widest uppercase rounded-full shadow-[0_20px_80px_-15px_rgba(56,189,248,0.4)] hover:shadow-[0_20px_100px_-10px_rgba(56,189,248,0.6)] transform active:scale-95 transition-all flex items-center gap-4"
        >
          EXECUTE MISSION
          <span className="text-2xl">→</span>
        </Button>
      </motion.div>
    </>
  );
};
