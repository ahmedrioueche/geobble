import { motion } from "framer-motion";
import { Check } from "lucide-react";
import React from "react";
import { Button } from "../../../components/atoms/Button";
import { type GameMode } from "../../../store/useGameStore";
import type { GameModeGroup } from "../../../types/modal";
import { useModalStore } from "../../../store/modal";

interface ModeSelectionProps {
  onClose: () => void;
  currentMode: GameMode;
}

const MODES_CONFIG = [
  {
    id: "country" as GameModeGroup,
    icon: "🎯",
    title: "COUNTRY MODE",
    badge: "LOCATE OR IDENTIFY",
    description:
      "Choose Locate to find a country from its name, flag, or capital. Choose Identify to name the highlighted country from four choices. Switch prompt types during play.",
  },
  {
    id: "pin" as GameModeGroup,
    icon: "📍",
    title: "PIN DROP",
    badge: "BORDERLESS MAP",
    description:
      "Play without borders. In Locate, place a pin inside the prompted country. In Identify, use the pin on the map to choose the country. Switch prompt types during play.",
  },
];

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  onClose,
  currentMode,
}) => {
  const [selected, setSelected] = React.useState<GameModeGroup>(
    currentMode === "pin" ? "pin" : "country",
  );
  const openModal = useModalStore((state) => state.openModal);

  const handleSelect = (modeGroup: GameModeGroup) => {
    setSelected(modeGroup);
  };

  const handleExecute = () => {
    openModal("sub-mode", { modeGroup: selected });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/95 backdrop-blur-3xl px-4 py-8 md:px-8 md:py-12 pb-28"
      >
        <div className="relative mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-5xl flex-col items-center justify-center">
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
            className="mb-6 text-center md:mb-9"
          >
            <h2 className="text-2xl md:text-5xl font-black tracking-tighter text-white mb-2 uppercase italic">
              SELECT <span className="text-[var(--color-accent)]">GAME</span> MODE
            </h2>
            <p className="text-[var(--color-text-secondary)] text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase opacity-90">
              Choose how you want to play
            </p>
          </motion.div>

          {/* Mode Cards Grid */}
          <div className="grid w-full max-w-4xl grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:gap-6">
            {MODES_CONFIG.map((mode, i) => (
              <motion.button
                key={mode.id}
                type="button"
                aria-pressed={selected === mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(mode.id)}
                className={`
                  group relative flex min-h-[240px] min-w-0 flex-col overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 sm:min-h-[270px] md:p-7
                  ${
                    selected === mode.id
                      ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.2)]"
                      : "border-white/20 bg-slate-900/80 hover:border-white/40 hover:bg-slate-900"
                  }
                `}
              >
                <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
                  <div className="text-4xl transition-transform duration-300 group-hover:scale-110 md:text-5xl">
                    {mode.icon}
                  </div>
                  <span className="inline-flex rounded-full border border-sky-400/30 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-400 sm:text-[10px]">
                    {mode.badge}
                  </span>
                </div>

                <h3 className="mb-3 break-words text-lg font-black uppercase leading-tight tracking-tight text-white md:text-2xl">
                  {mode.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-300 md:text-base">
                  {mode.description}
                </p>

                <div className="mt-auto flex min-h-8 items-end pt-5">
                  {selected === mode.id && (
                    <motion.span
                      layoutId="active-indicator"
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Selected
                    </motion.span>
                  )}
                </div>
              </motion.button>
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
