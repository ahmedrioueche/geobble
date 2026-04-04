import { motion } from "framer-motion";
import React from "react";
import { Button } from "../../../components/atoms/Button";

interface ChoicePanelProps {
  choices: string[];
  onChoice: (choice: string) => void;
  disabled?: boolean;
}

export const ChoicePanel: React.FC<ChoicePanelProps> = ({
  choices,
  onChoice,
  disabled,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 p-4 pb-8 md:pb-4 md:relative md:bottom-auto md:p-0 z-50 bg-slate-950/80 backdrop-blur-3xl md:bg-transparent border-t border-white/5 md:border-0"
    >
      <div className="max-w-md mx-auto grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
        {choices.map((choice, i) => (
          <motion.div
            key={choice}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Button
              variant="outline"
              onClick={() => onChoice(choice)}
              disabled={disabled}
              className="w-full h-14 md:h-16 text-xs md:text-sm font-black tracking-widest uppercase border-white/10 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all text-white/80 hover:text-white"
            >
              {choice}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
