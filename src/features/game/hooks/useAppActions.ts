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
    setStreakLost,
    setTempHighlightCode,
  } = useGameStore();

  const {
    countries,
    loading,
    nextQuestion,
    currentCountry,
    startGame,
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
            const freshState = useGameStore.getState();
            if (freshState.totalAttempts < freshState.challengeValue || freshState.challengeType !== "count") {
              nextQuestion();
            }
          }, 1200);
        } else {
          recordAttempt(false);
          playAudio("/audio/wrong.mp3");
          setFeedback("wrong", name, code);
          setRevealed(true);
          if (streak > 0) setStreakLost(streak);
          setStreak(0);
          setTimeout(() => {
            const freshState = useGameStore.getState();
            if (freshState.totalAttempts < freshState.challengeValue || freshState.challengeType !== "count") {
              nextQuestion();
            }
          }, 2000);
        }
      } else {
        setClickedCountry(countryData);
        if (countryData?.cca3) {
          setTempHighlightCode(countryData.cca3);
          setTimeout(() => {
            setTempHighlightCode(null);
          }, 1000);
        }
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
      setStreakLost,
      setTempHighlightCode,
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
          const freshState = useGameStore.getState();
          if (freshState.totalAttempts < freshState.challengeValue || freshState.challengeType !== "count") {
            nextQuestion();
          }
        }, 1200);
      } else {
        recordAttempt(false);
        playAudio("/audio/wrong.mp3");
        setFeedback("wrong", choice);
        setRevealed(true);
        if (streak > 0) setStreakLost(streak);
        setStreak(0);
        setTimeout(() => {
          const freshState = useGameStore.getState();
          if (freshState.totalAttempts < freshState.challengeValue || freshState.challengeType !== "count") {
            nextQuestion();
          }
        }, 2000);
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
      setStreakLost,
    ],
  );

  const handleFinalStart = useCallback(() => {
    setClickedCountry(null);
    startNewMission();
    startGame();
  }, [startGame, startNewMission]);

  const handleSkip = useCallback(() => {
    if (currentCountry) {
      recordAttempt(false);
      setRevealed(true);
      if (streak > 0) setStreakLost(streak);
      setStreak(0);

      setTimeout(() => {
        const freshState = useGameStore.getState();
        if (freshState.totalAttempts < freshState.challengeValue || freshState.challengeType !== "count") {
          nextQuestion();
        }
      }, 1500);
    } else {
      nextQuestion();
    }
  }, [
    currentCountry,
    setRevealed,
    setStreak,
    nextQuestion,
    recordAttempt,
    streak,
    setStreakLost,
  ]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    useGameStore.getState().triggerPulse();
    if (mode === "identify" && streak > 0) {
      setStreakLost(streak);
      setStreak(0);
    }
  }, [mode, streak, setRevealed, setStreak, setStreakLost]);

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
    handleReveal,
    skipQuestion: handleSkip,
    nextQuestion,
    currentCountry,
    countries,
    loading,
  };
};
