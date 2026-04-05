import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { ChoicePanel } from "./ChoicePanel";
import { FeedbackPill } from "./FeedbackPill";
import { TargetPanel } from "./TargetPanel";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface TacticalInterfaceProps {
  currentCountry: CountryData | undefined;
  countries: CountryData[];
  onChoiceSelect: (choice: string) => void;
  onSkip: () => void;
  onReveal: () => void;
}

export const TacticalInterface: React.FC<TacticalInterfaceProps> = ({
  currentCountry,
  countries,
  onChoiceSelect,
  onSkip,
  onReveal,
}) => {
  const { gameStatus, mode, feedback, clickedName, choices } = useGameStore();

  return (
    <div className="absolute top-28 md:top-24 landscape:top-16 landscape:md:top-24 right-4 z-40 pointer-events-none">
      <div className="flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)] md:max-w-full">
        <AnimatePresence mode="wait">
          {gameStatus === "playing" && currentCountry && (
            <motion.div
              key={currentCountry.cca3}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="pointer-events-auto flex flex-col items-end gap-3"
            >
              <div className="w-full flex flex-col items-end gap-3">
                <TargetPanel
                  country={currentCountry}
                  feedback={feedback}
                  onSkip={onSkip}
                  onReveal={onReveal}
                />
              </div>

              {mode === "reverse" && (
                <div className="shadow-2xl rounded-3xl overflow-hidden bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-3 w-fit">
                  <ChoicePanel
                    choices={choices}
                    onChoice={onChoiceSelect}
                    disabled={!!feedback}
                    countries={countries}
                  />
                </div>
              )}

              <FeedbackPill feedback={feedback} clickedName={clickedName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
