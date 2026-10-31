import { useCallback } from "react";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { useChallengeCompletion } from "./hooks/useChallengeCompletion";
import { useChoiceGeneration } from "./hooks/useChoiceGeneration";
import { useCountryData } from "./hooks/useCountryData";
import { useMissionProgression } from "./hooks/useMissionProgression";
import { buildMissionResult } from "./missionResult";

export const useGameLogic = () => {
  const {
    score,
    currentCountryCode,
    mode,
    pinDirection,
    subMode,
    setChoices,
    setChoiceCodes,
    gameStatus,
    setGameStatus,
    challengeType,
    challengeValue,
    totalQuestions,
    totalAttempts,
    correctAttempts,
    setTimeRemaining,
    difficultyStage,
    startTime,
    unlockNextStage,
    totalLevels,
    maxStreak,
  } = useGameStore();
  const { openModal } = useModalStore();

  const { countries, loading } = useCountryData();
  const generateChoices = useChoiceGeneration({
    countries,
    subMode,
    mode,
    pinDirection,
    gameStatus,
    currentCountryCode,
    setChoices,
    setChoiceCodes,
  });

  const finishGame = useCallback(() => {
    setGameStatus("finished");
    const result = buildMissionResult({
      score,
      maxStreak,
      totalAttempts,
      correctAttempts,
      challengeType,
      challengeValue,
      difficultyStage,
      totalQuestions,
      countriesCount: countries.length,
      startTime,
      totalLevels,
    });

    if (result.isVictory) {
      unlockNextStage();
    }

    openModal("result", result);
  }, [
    setGameStatus,
    totalQuestions,
    totalAttempts,
    correctAttempts,
    challengeType,
    challengeValue,
    countries.length,
    openModal,
    score,
    difficultyStage,
    startTime,
    totalLevels,
    maxStreak,
    unlockNextStage,
  ]);

  useChallengeCompletion({
    gameStatus,
    challengeType,
    challengeValue,
    totalAttempts,
    finishGame,
    setTimeRemaining,
  });

  const { startGame, nextQuestion } = useMissionProgression({
    countries,
    generateChoices,
    finishGame,
  });

  return {
    countries,
    loading,
    startGame,
    nextQuestion,
    currentCountry: countries.find((c) => c.cca3 === currentCountryCode),
  };
};
