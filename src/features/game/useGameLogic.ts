import { useCallback } from "react";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { useChallengeCompletion } from "./hooks/useChallengeCompletion";
import { useChoicePresentation } from "./hooks/useChoicePresentation";
import { useCountryData } from "./hooks/useCountryData";
import { useMissionProgression } from "./hooks/useMissionProgression";
import { finishMission } from "./gameEngine";
import {
  systemGameClock,
  type GameClock,
} from "../../store/gameClock";
import { useShallow } from "zustand/react/shallow";

export const useGameLogic = (clock: GameClock = systemGameClock) => {
  const {
    currentCountryCode,
    mode,
    pinDirection,
    subMode,
    gameStatus,
    challengeType,
    challengeValue,
    totalAttempts,
    timerDeadlineAt,
  } = useGameStore(
    useShallow((state) => ({
      currentCountryCode: state.session.currentCountryCode,
      mode: state.session.mode,
      pinDirection: state.session.pinDirection,
      subMode: state.session.subMode,
      gameStatus: state.session.gameStatus,
      challengeType: state.session.challengeType,
      challengeValue: state.session.challengeValue,
      totalAttempts: state.session.totalAttempts,
      timerDeadlineAt: state.session.timerDeadlineAt,
    })),
  );
  const {
    setChoices,
    setChoiceCodes,
    setTimeRemaining,
    unlockNextStage,
  } = useGameStore(
    useShallow((state) => ({
      setChoices: state.setChoices,
      setChoiceCodes: state.setChoiceCodes,
      setTimeRemaining: state.setTimeRemaining,
      unlockNextStage: state.unlockNextStage,
    })),
  );
  const openModal = useModalStore((state) => state.openModal);

  const { countries, loading } = useCountryData();
  useChoicePresentation({
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
    const state = useGameStore.getState();
    const transition = finishMission(state.session, countries.length, clock());
    useGameStore.setState({ session: transition.session });

    if (transition.result.isVictory) {
      unlockNextStage();
    }

    openModal("result", transition.result);
  }, [countries.length, openModal, clock, unlockNextStage]);

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
