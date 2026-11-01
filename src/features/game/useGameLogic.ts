import { useCallback } from "react";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { useChallengeCompletion } from "./hooks/useChallengeCompletion";
import { useChoiceGeneration } from "./hooks/useChoiceGeneration";
import { useCountryData } from "./hooks/useCountryData";
import { useMissionProgression } from "./hooks/useMissionProgression";
import { buildMissionResult } from "./missionResult";
import {
  systemGameClock,
  type GameClock,
} from "../../store/gameClock";
import { useShallow } from "zustand/react/shallow";

export const useGameLogic = (clock: GameClock = systemGameClock) => {
  const {
    score,
    currentCountryCode,
    mode,
    pinDirection,
    subMode,
    gameStatus,
    challengeType,
    challengeValue,
    totalQuestions,
    totalAttempts,
    correctAttempts,
    difficultyStage,
    startTime,
    timerDeadlineAt,
    totalLevels,
    maxStreak,
  } = useGameStore(
    useShallow((state) => ({
      score: state.session.score,
      currentCountryCode: state.session.currentCountryCode,
      mode: state.session.mode,
      pinDirection: state.session.pinDirection,
      subMode: state.session.subMode,
      gameStatus: state.session.gameStatus,
      challengeType: state.session.challengeType,
      challengeValue: state.session.challengeValue,
      totalQuestions: state.session.totalQuestions,
      totalAttempts: state.session.totalAttempts,
      correctAttempts: state.session.correctAttempts,
      difficultyStage: state.session.difficultyStage,
      startTime: state.session.startTime,
      timerDeadlineAt: state.session.timerDeadlineAt,
      totalLevels: state.session.totalLevels,
      maxStreak: state.session.maxStreak,
    })),
  );
  const {
    setChoices,
    setChoiceCodes,
    setGameStatus,
    setTimeRemaining,
    unlockNextStage,
    nextRandom,
  } = useGameStore(
    useShallow((state) => ({
      setChoices: state.setChoices,
      setChoiceCodes: state.setChoiceCodes,
      setGameStatus: state.setGameStatus,
      setTimeRemaining: state.setTimeRemaining,
      unlockNextStage: state.unlockNextStage,
      nextRandom: state.nextRandom,
    })),
  );
  const openModal = useModalStore((state) => state.openModal);

  const { countries, loading } = useCountryData();
  const generateChoices = useChoiceGeneration({
    countries,
    subMode,
    mode,
    pinDirection,
    gameStatus,
    currentCountryCode,
    random: nextRandom,
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
      now: clock(),
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
    clock,
    unlockNextStage,
  ]);

  useChallengeCompletion({
    gameStatus,
    challengeType,
    challengeValue,
    totalAttempts,
    timerDeadlineAt,
    finishGame,
    setTimeRemaining,
    clock,
  });

  const { startGame, nextQuestion } = useMissionProgression({
    countries,
    random: nextRandom,
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
