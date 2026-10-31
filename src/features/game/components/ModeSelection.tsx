import { motion } from "framer-motion";
import React from "react";
import { Button } from "../../../components/atoms/Button";
import { type GameMode } from "../../../store/useGameStore";
import type { GameModeGroup } from "../../../types/modal";
import { useModalStore } from "../../../store/modal";
import type { GameSessionSnapshot } from "../../../store/gameSessionSnapshot";
import { ModeOptionCard } from "./ModeOptionCard";
import { MODE_OPTIONS } from "./modeOptions";

interface ModeSelectionProps {
  onClose: () => void;
  currentMode: GameMode;
  savedSession: GameSessionSnapshot | null;
  onResume: () => void;
  onRetrySave: () => void;
  resumeError: string | null;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  onClose,
  currentMode,
  savedSession,
  onResume,
  onRetrySave,
  resumeError,
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
        className="fixed inset-0 z-[100] flex items-start justify-start overflow-y-auto bg-slate-950/95 backdrop-blur-3xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-28 md:items-center md:justify-center md:px-8 md:py-12"
      >
        <div className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-col items-center justify-start pt-2 md:min-h-[calc(100dvh-8rem)] md:justify-center md:pt-0">
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
            {MODE_OPTIONS.map((mode, index) => (
              <ModeOptionCard
                key={mode.id}
                mode={mode}
                selected={selected === mode.id}
                index={index}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Action Bar */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-6 inset-x-4 md:inset-x-auto md:right-12 z-[110] flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center"
      >
        {resumeError && (
          <>
            <p role="alert" className="text-center text-xs font-bold text-rose-300">
              {resumeError}
            </p>
            <Button
              size="md"
              variant="secondary"
              onClick={onRetrySave}
              className="h-14 px-5 text-xs font-black uppercase tracking-widest"
            >
              Retry save
            </Button>
          </>
        )}
        {savedSession && (
          <Button
            size="lg"
            variant="secondary"
            onClick={onResume}
            className="h-14 px-6 text-sm font-black uppercase tracking-widest sm:h-18"
          >
            Resume saved game
          </Button>
        )}
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
