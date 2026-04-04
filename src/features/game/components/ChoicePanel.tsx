import { motion } from "framer-motion";
import React from "react";
import { Button } from "../../../components/atoms/Button";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";

interface ChoicePanelProps {
  choices: string[];
  onChoice: (choice: string) => void;
  disabled?: boolean;
  countries: CountryData[];
}

export const ChoicePanel: React.FC<ChoicePanelProps> = ({
  choices,
  onChoice,
  disabled,
  countries,
}) => {
  const { subMode } = useGameStore();

  return (
    <div className="grid grid-cols-1 gap-2 md:gap-3 w-max max-w-[300px] md:max-w-[240px] md:ml-auto md:mr-0 mx-auto">
      {choices.map((choice, i) => {
        const country = countries.find((c) =>
          subMode === "flag"
            ? c.cca2 === choice
            : subMode === "capital"
              ? c.capital[0] === choice
              : c.name === choice,
        );

        return (
          <motion.div
            key={choice}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Button
              variant="outline"
              onClick={() => onChoice(choice)}
              disabled={disabled}
              className="w-full h-12 md:h-14 border-white/10 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all group/choice flex items-center justify-center p-2"
            >
              {subMode === "flag" && country ? (
                <img
                  src={`https://flagcdn.com/w80/${country.cca2.toLowerCase()}.png`}
                  alt="Choice"
                  className="h-6 md:h-8 w-auto rounded shadow-sm border border-white/5"
                />
              ) : (
                <span className="text-[10px] md:text-[11px] font-black tracking-widest uppercase text-white/80 group-hover/choice:text-white whitespace-normal leading-[1.1] px-2 text-center">
                  {choice}
                </span>
              )}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};
