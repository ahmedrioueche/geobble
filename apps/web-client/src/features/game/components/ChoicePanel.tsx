import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { Check } from "lucide-react";
import { Button } from "../../../components/atoms/Button";
import { FlagImage } from "../../../components/atoms/FlagImage";
import type { CountryData } from "../../../data/country-data";
import { useGameStore, type SubMode } from "../../../store/useGameStore";
import { useGameUiStore } from "../../../store/useGameUiStore";
import { useShallow } from "zustand/react/shallow";

interface ChoicePanelProps {
  choices: string[];
  choiceCodes: string[];
  onChoice: (countryCode: string, choice: string) => void;
  disabled?: boolean;
  countries: CountryData[];
  subModeOverride?: SubMode;
}

export const ChoicePanel: React.FC<ChoicePanelProps> = ({
  choices,
  choiceCodes,
  onChoice,
  disabled,
  countries,
  subModeOverride,
}) => {
  const { subMode, currentCountryCode, revealed } = useGameStore(
    useShallow((state) => ({
      subMode: state.session.subMode,
      currentCountryCode: state.session.currentCountryCode,
      revealed: state.session.revealed,
    })),
  );
  const { feedback, clickedName } = useGameUiStore(
    useShallow((state) => ({
      feedback: state.feedback,
      clickedName: state.clickedName,
    })),
  );
  const activeSubMode = subModeOverride || subMode;
  const isRevealed = Boolean(feedback || revealed);

  const targetCountry = React.useMemo(() => 
    countries.find(c => c.cca3 === currentCountryCode),
    [countries, currentCountryCode]
  );

  const isCorrectChoice = (choice: string) => {
    if (!targetCountry || !choice) return false;
    const c = choice.toLowerCase();
    if (activeSubMode === 'flag') return c === targetCountry.cca2?.toLowerCase();
    if (activeSubMode === 'capital') return c === targetCountry.capital?.[0]?.toLowerCase();
    return c === targetCountry.name?.toLowerCase();
  };

  return (
    <div
      className={`grid gap-2 sm:gap-2.5 w-full mx-auto transition-all duration-300 ${
        activeSubMode === "flag"
          ? "grid-cols-2 max-w-[340px] sm:max-w-[420px] md:max-w-[460px]"
          : "grid-cols-1 max-w-[440px] md:max-w-[600px] md:ml-auto md:mr-0"
      }`}
    >
      <AnimatePresence mode="popLayout">
        {choices.map((choice, i) => {
          const country =
            countries.find((item) => item.cca3 === choiceCodes[i]) ??
            countries.find(
              (item) => item.cca2?.toLowerCase() === choice.toLowerCase(),
            );

          const isCorrect = isCorrectChoice(choice);
          const isClicked = clickedName === choice;

          // In flag mode when revealed, the 3 wrong answers disappear
          if (activeSubMode === "flag" && isRevealed && !isCorrect) {
            return null;
          }

          return (
            <motion.div
              className={`relative flex items-center ${
                activeSubMode === "flag" && isRevealed && isCorrect
                  ? "col-span-2 w-full"
                  : "w-full"
              }`}
              exit={{
                filter: "blur(6px)",
                opacity: 0,
                scale: 0.65,
                transition: { duration: 0.28, ease: "easeIn" },
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={choice}
              layout
              transition={{
                duration: 0.25,
                layout: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              {/* Educational Hint: Reveal names after choice or skip for capital mode */}
              {activeSubMode === "capital" && isRevealed && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="pointer-events-none absolute right-[105%] top-1/2 z-50 max-w-[280px] -translate-y-1/2 rounded-xl border border-white/20 bg-emerald-500/10 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl sm:max-w-[400px] md:max-w-none"
                  initial={{ opacity: 0, scale: 0.9, x: -15 }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCorrect ? "animate-pulse bg-emerald-400" : "bg-white/40"}`}
                    />
                    <span
                      className={`truncate whitespace-nowrap text-[9px] font-black uppercase leading-tight tracking-[0.1em] md:text-[10px] md:tracking-[0.15em] ${isCorrect ? "text-emerald-400" : "text-white/70"}`}
                    >
                      {country?.name || choice}
                    </span>
                  </div>
                </motion.div>
              )}

              <Button
                className={`group/choice flex min-w-0 w-full items-center justify-center p-2 shadow-lg transition-all ${
                  activeSubMode === "flag" && isRevealed && isCorrect
                    ? "!h-16 sm:!h-18 !border-emerald-400 !bg-gradient-to-r !from-emerald-500/35 !via-emerald-500/20 !to-slate-900/95 !text-white shadow-[0_0_35px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/50"
                    : activeSubMode === "flag"
                      ? "h-14 sm:h-16 border-white/20 bg-slate-900/90 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                      : "h-12 md:h-14 border-white/20 bg-slate-900/90 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                } ${
                  activeSubMode !== "flag" && isRevealed && isCorrect
                    ? "!border-white !bg-emerald-500 !text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] !opacity-100 scale-[1.05] z-10"
                    : feedback === "wrong" && isClicked
                      ? "!border-white !bg-red-600 !text-white !opacity-100 scale-[0.98]"
                      : ""
                }`}
                disabled={disabled}
                onClick={() => onChoice(choiceCodes[i] ?? "", choice)}
                variant="outline"
              >
                {activeSubMode === "flag" && country ? (
                  isRevealed && isCorrect ? (
                    <div className="flex w-full items-center justify-between px-2 sm:px-3">
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <FlagImage
                          alt="Choice"
                          className="h-9 w-auto shrink-0 rounded-md border-2 border-white shadow-md sm:h-10"
                          code={country.cca2}
                          fallback={
                            <span className="text-2xl leading-none">
                              {country.flag}
                            </span>
                          }
                          size="md"
                        />
                        <motion.div
                          animate={{ filter: "blur(0px)", opacity: 1, scale: 1, x: 0 }}
                          className="flex min-w-0 flex-1 flex-col items-start text-left"
                          initial={{ filter: "blur(4px)", opacity: 0, scale: 0.95, x: -12 }}
                          transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 sm:text-[11px]">
                            {feedback === "correct" ? "Correct Answer" : "Answer"}
                          </span>
                          <span className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                            {country.name || targetCountry?.name || choice}
                          </span>
                        </motion.div>
                      </div>
                      <motion.div
                        animate={{ rotate: 0, scale: 1 }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-md sm:h-8 sm:w-8"
                        initial={{ rotate: -20, scale: 0 }}
                        transition={{ damping: 22, delay: 0.22, stiffness: 350, type: "spring" }}
                      >
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 stroke-[3] sm:h-5 sm:w-5"
                        />
                      </motion.div>
                    </div>
                  ) : (
                    <FlagImage
                      alt="Choice"
                      className="h-8 w-auto rounded-md border border-white/20 shadow-sm sm:h-9"
                      code={country.cca2}
                      fallback={
                        <span className="text-2xl leading-none">
                          {country.flag}
                        </span>
                      }
                      size="md"
                    />
                  )
                ) : (
                  <span
                    className={`block w-full truncate px-2 text-center text-[10px] font-black uppercase tracking-wider leading-[1.1] transition-colors md:text-[11px] ${
                      isRevealed && isCorrect
                        ? "!text-white"
                        : feedback === "wrong" && isClicked
                          ? "!text-white"
                          : "text-white group-hover/choice:text-sky-300"
                    }`}
                  >
                    {choice}
                  </span>
                )}
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
