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
  const { subMode, currentCountryCode, feedback, clickedName, revealed } = useGameStore();

  const targetCountry = React.useMemo(() => 
    countries.find(c => c.cca3 === currentCountryCode),
    [countries, currentCountryCode]
  );

  const isCorrectChoice = (choice: string) => {
    if (!targetCountry) return false;
    if (subMode === 'flag') return choice.toLowerCase() === targetCountry.cca2.toLowerCase();
    if (subMode === 'capital') return choice.toLowerCase() === targetCountry.capital[0].toLowerCase();
    return choice.toLowerCase() === targetCountry.name.toLowerCase();
  };

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

        const isCorrect = isCorrectChoice(choice);
        const isClicked = clickedName === choice;

        return (
          <motion.div
            key={choice}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative flex items-center"
          >
            {/* Educational Hint: Reveal names after choice or skip */}
            {(subMode === 'flag' || subMode === 'capital') && (feedback || revealed) && (
              <motion.div
                initial={{ opacity: 0, x: -15, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className="absolute right-[110%] top-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap bg-emerald-500/10 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl z-50"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isCorrect ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isCorrect ? 'text-emerald-400' : 'text-white/70'}`}>
                    {country?.name || choice}
                  </span>
                </div>
              </motion.div>
            )}

            <Button
              variant="outline"
              onClick={() => onChoice(choice)}
              disabled={disabled}
              className={`w-full h-12 md:h-14 border-white/10 transition-all group/choice flex items-center justify-center p-2 ${
                (feedback === 'correct' || revealed) && isCorrect
                  ? '!bg-emerald-500 !text-white !border-white shadow-[0_0_30px_rgba(16,185,129,0.5)] !opacity-100 scale-[1.05] z-10'
                  : feedback === 'wrong' && isClicked
                  ? '!bg-red-600 !text-white !border-white !opacity-100 scale-[0.98]'
                  : (feedback || revealed) && isCorrect
                  ? 'bg-emerald-500/20 border-emerald-500/40 opacity-80'
                  : 'hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5'
              }`}
            >
              {subMode === "flag" && country ? (
                <img
                  src={`https://flagcdn.com/w80/${country.cca2.toLowerCase()}.png`}
                  alt="Choice"
                  className={`h-6 md:h-8 w-auto rounded shadow-sm border ${
                    (feedback === 'correct' || revealed) && isCorrect ? 'border-white scale-110' : 'border-white/5'
                  }`}
                />
              ) : (
                <span className={`text-[10px] md:text-[11px] font-black tracking-widest uppercase whitespace-normal leading-[1.1] px-2 text-center transition-colors ${
                  (feedback === 'correct' || revealed) && isCorrect 
                    ? '!text-white' 
                    : feedback === 'wrong' && isClicked
                    ? '!text-white'
                    : 'text-white/80 group-hover/choice:text-white'
                }`}>
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
