import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../../data/country-data";
import { nameMapping } from "../../../data/name-mapping";
import { useGameStore } from "../../../store/useGameStore";
import { useGameLogic } from "../useGameLogic";

export const useAppActions = () => {
  const {
    gameStatus,
    mode,
    subMode,
    choices,
    feedback,
    revealed,
    setFeedback,
    setRevealed,
    score,
    setScore,
    streak,
    setStreak,
  } = useGameStore();

  const {
    countries,
    nextQuestion,
    currentCountry,
    startGame,
    skipQuestion,
  } = useGameLogic();

  const [clickedCountry, setClickedCountry] = useState<CountryData | null>(null);

  useEffect(() => {
    if (clickedCountry) {
      const timer = setTimeout(() => {
        setClickedCountry(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [clickedCountry]);

  const handleCountryClick = useCallback(
    (name: string, code: string) => {
      if (mode !== "identify" || feedback) return;

      // Multi-tiered lookup: cca3 -> ccn3 (numeric) -> name mapping -> raw name
      let countryData = countries.find((c) => c.cca3 === code) || null;
      if (!countryData) {
        countryData = countries.find((c) => c.ccn3 === code) || null;
      }
      if (!countryData) {
        const mappedName = nameMapping[name] || name;
        countryData =
          countries.find(
            (c) => c.name.toLowerCase() === mappedName.toLowerCase(),
          ) || null;
      }

      if (gameStatus === "playing") {
        const targetCountry = currentCountry;
        if (!targetCountry) return;

        const mappedClickedName = nameMapping[name] || name;
        const isCorrect =
          mappedClickedName.toLowerCase() === targetCountry.name.toLowerCase();

        if (isCorrect) {
          if (revealed) {
            nextQuestion();
            return;
          }

          setFeedback("correct", name, code);
          setScore(score + 10 * (streak + 1));
          setStreak(streak + 1);
          setTimeout(() => {
            nextQuestion();
          }, 1500);
        } else {
          setFeedback("wrong", name, code);
          setStreak(0);
          setTimeout(() => {
            setFeedback(null, null, null);
          }, 1500);
        }
      } else {
        setClickedCountry(countryData);
      }
    },
    [
      mode,
      feedback,
      nextQuestion,
      countries,
      gameStatus,
      currentCountry,
      setFeedback,
      score,
      setScore,
      streak,
      setStreak,
      revealed,
    ],
  );

  const handleChoiceSelect = useCallback(
    (choice: string) => {
      if (feedback || !currentCountry) return;

      let isCorrect = false;
      if (subMode === "flag") {
        isCorrect = choice.toLowerCase() === currentCountry.cca2.toLowerCase();
      } else if (subMode === "capital") {
        isCorrect =
          choice.toLowerCase() === currentCountry.capital[0].toLowerCase();
      } else {
        isCorrect = choice.toLowerCase() === currentCountry.name.toLowerCase();
      }

      if (isCorrect) {
        if (revealed) {
          nextQuestion();
          return;
        }

        setFeedback("correct", choice);
        setScore(score + 10 * (streak + 1));
        setStreak(streak + 1);
        setTimeout(() => {
          nextQuestion();
        }, 1500);
      } else {
        setFeedback("wrong", choice);
        setStreak(0);
        setTimeout(() => {
          setFeedback(null, null);
        }, 1500);
      }
    },
    [
      feedback,
      currentCountry,
      subMode,
      nextQuestion,
      setFeedback,
      score,
      setScore,
      streak,
      setStreak,
      revealed,
    ],
  );

  const handleFinalStart = useCallback(() => {
    setClickedCountry(null);
    startGame();
  }, [startGame]);

  return {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
    handleFinalStart,
    gameStatus,
    mode,
    choices,
    feedback,
    revealed,
    setRevealed,
    skipQuestion,
    nextQuestion,
    currentCountry,
    countries,
  };
};
