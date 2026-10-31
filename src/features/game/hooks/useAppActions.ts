import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../../../store/useGameStore";
import { useGameLogic } from "../useGameLogic";
import {
  shouldAdvanceRound,
  type RoundAction,
} from "../gameRules";
import { useAnswerSelection } from "./useAnswerSelection";
import { useRoundControls } from "./useRoundControls";
import {
  createTimeoutController,
  executeRoundAction,
} from "../roundActionExecutor";

export const useAppActions = () => {
  const {
    gameStatus,
    mode,
    pinDirection,
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
  } = useGameStore();

  const {
    countries,
    loading,
    nextQuestion,
    currentCountry,
    startGame,
  } = useGameLogic();

  const roundAdvanceTimerRef = useRef<
    ReturnType<typeof createTimeoutController> | null
  >(null);
  if (roundAdvanceTimerRef.current === null) {
    roundAdvanceTimerRef.current = createTimeoutController();
  }

  const clearRoundAdvanceTimer = useCallback(() => {
    roundAdvanceTimerRef.current?.clear();
  }, []);

  useEffect(() => {
    return () => {
      clearRoundAdvanceTimer();
    };
  }, [clearRoundAdvanceTimer]);

  const playAudio = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.4; // Tactile, not overwhelming
    audio.play().catch(() => {}); // Ignore silent playback blocks
  }, []);

  const applyRoundAction = useCallback(
    (
      action: RoundAction,
      clickedName: string,
      clickedCode: string | null = null,
    ) => {
      executeRoundAction(
        action,
        { score, streak, revealed },
        clickedName,
        clickedCode,
        {
          recordAttempt,
          playFeedback: (feedbackType) =>
            playAudio(
              feedbackType === "correct"
                ? "/audio/correct.mp3"
                : "/audio/wrong.mp3",
            ),
          setFeedback,
          setScore,
          setStreak,
          setStreakLost,
          setRevealed,
          clearAdvanceTimer: clearRoundAdvanceTimer,
          scheduleAdvance: (delayMs) => {
            roundAdvanceTimerRef.current?.schedule(delayMs, () => {
              const freshState = useGameStore.getState();
              if (
                shouldAdvanceRound(
                  freshState.challengeType,
                  freshState.challengeValue,
                  freshState.totalAttempts,
                )
              ) {
                nextQuestion();
              }
            });
          },
          nextQuestion,
        },
      );
    },
    [
      clearRoundAdvanceTimer,
      nextQuestion,
      playAudio,
      recordAttempt,
      revealed,
      score,
      setFeedback,
      setRevealed,
      setScore,
      setStreak,
      setStreakLost,
      streak,
    ],
  );

  const {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
  } = useAnswerSelection({
    countries,
    currentCountry,
    gameStatus,
    mode,
    pinDirection,
    subMode,
    feedback,
    applyRoundAction,
  });

  const { start, skip, reveal } = useRoundControls({
    currentCountry,
    mode,
    clearAdvanceTimer: clearRoundAdvanceTimer,
    applyRoundAction,
    nextQuestion,
    clearClickedCountry: () => setClickedCountry(null),
    startNewMission,
    startGame,
  });

  return {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
    handleFinalStart: start,
    gameStatus,
    mode,
    choices,
    feedback,
    missionId,
    revealed,
    setRevealed,
    handleReveal: reveal,
    skipQuestion: skip,
    nextQuestion,
    currentCountry,
    countries,
    loading,
  };
};
