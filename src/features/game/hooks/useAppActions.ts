import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../../data/country-data";
import { nameMapping } from "../../../data/name-mapping";
import { normalizeCountryName } from "../../../utils/name-normalizer";
import { useGameStore } from "../../../store/useGameStore";
import { useGameLogic } from "../useGameLogic";

export const useAppActions = () => {
  const {
    gameStatus,
    mode,
    subMode,
    choices,
    feedback,
    missionId,
    revealed,
    setFeedback,
    setRevealed,
    score,
    setScore,
    streak,
    setStreak,
    startNewMission,
    recordAttempt,
    streakLost,
    setStreakLost,
  } = useGameStore();

  const {
    countries,
    nextQuestion,
    currentCountry,
    startGame,
    skipQuestion,
  } = useGameLogic();

  const [clickedCountry, setClickedCountry] = useState<CountryData | null>(null);

  const playAudio = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.4; // Tactile, not overwhelming
    audio.play().catch(() => {}); // Ignore silent playback blocks
  }, []);

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
        const normalizedInput = normalizeCountryName(nameMapping[name] || name);
        countryData =
          countries.find(
            (c) => normalizeCountryName(c.name) === normalizedInput,
          ) || null;
      }

      if (gameStatus === "playing") {
        const targetCountry = currentCountry;
        if (!targetCountry) return;

        const normalizedTarget = normalizeCountryName(targetCountry.name);
        const normalizedClicked = normalizeCountryName(nameMapping[name] || name);
        const isCorrect = normalizedTarget === normalizedClicked;

        if (isCorrect) {
          if (revealed) {
            nextQuestion();
            return;
          }

          recordAttempt(true);
          playAudio("/audio/correct.mp3");
          setFeedback("correct", name, code);
          setScore(score + 10 * (streak + 1));
          setStreak(streak + 1);
          setTimeout(() => {
            nextQuestion();
          }, 1500);
        } else {
          recordAttempt(false);
          playAudio("/audio/wrong.mp3");
          setFeedback("wrong", name, code);
          if (streak > 0) setStreakLost(streak);
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
      playAudio,
      recordAttempt,
    ],
  );

  const handleChoiceSelect = useCallback(
    (choice: string) => {
      if (feedback || !currentCountry) return;

      const normalizedTarget = normalizeCountryName(currentCountry.name);
      const normalizedChoice = normalizeCountryName(choice);
      let isCorrect = false;

      if (subMode === "flag") {
        isCorrect = choice.toLowerCase() === currentCountry.cca2.toLowerCase();
      } else if (subMode === "capital") {
        isCorrect =
          choice.toLowerCase() === currentCountry.capital[0].toLowerCase();
      } else {
        isCorrect = normalizedChoice === normalizedTarget;
      }

      if (isCorrect) {
        if (revealed) {
          nextQuestion();
          return;
        }

        recordAttempt(true);
        playAudio("/audio/correct.mp3");
        setFeedback("correct", choice);
        setScore(score + 10 * (streak + 1));
        setStreak(streak + 1);
        setTimeout(() => {
          nextQuestion();
        }, 1500);
      } else {
        recordAttempt(false);
        playAudio("/audio/wrong.mp3");
        setFeedback("wrong", choice);
        if (streak > 0) setStreakLost(streak);
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
      playAudio,
      recordAttempt,
    ],
  );

  const handleFinalStart = useCallback(() => {
    setClickedCountry(null);
    startNewMission();
    startGame();
  }, [startGame, startNewMission]);

  const skipQuestionInternal = skipQuestion;

  const handleSkip = useCallback(() => {
    if (mode === "reverse" && currentCountry) {
      recordAttempt(false);
      // Highlight the correct choice using revealed state
      // This provides visual feedback without triggering success messages/score
      setRevealed(true);
      if (streak > 0) setStreakLost(streak);
      setStreak(0);

      // Wait a bit before skipping
      setTimeout(() => {
        nextQuestion();
      }, 1000);
    } else {
      skipQuestionInternal();
    }
  }, [
    mode,
    currentCountry,
    setRevealed,
    setStreak,
    nextQuestion,
    skipQuestionInternal,
  ]);

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
    missionId,
    revealed,
    setRevealed,
    skipQuestion: handleSkip,
    nextQuestion,
    currentCountry,
    countries,
  };
};
