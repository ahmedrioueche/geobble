import { useEffect } from "react";
import { useGameStore, type ChallengeType } from "../../../store/useGameStore";
import {
  isChallengeComplete,
  isCountChallengeComplete,
} from "../gameRules";

interface UseChallengeCompletionProps {
  gameStatus: "idle" | "playing" | "finished";
  challengeType: ChallengeType;
  challengeValue: number;
  totalAttempts: number;
  finishGame: () => void;
  setTimeRemaining: (time: number) => void;
}

export const useChallengeCompletion = ({
  gameStatus,
  challengeType,
  challengeValue,
  totalAttempts,
  finishGame,
  setTimeRemaining,
}: UseChallengeCompletionProps) => {
  useEffect(() => {
    if (
      gameStatus === "playing" &&
      isCountChallengeComplete(challengeType, challengeValue, totalAttempts)
    ) {
      const timer = setTimeout(() => {
        if (useGameStore.getState().gameStatus === "playing") {
          finishGame();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, challengeType, totalAttempts, challengeValue, finishGame]);

  useEffect(() => {
    if (gameStatus !== "playing" || challengeType !== "timer") return;

    const timer: ReturnType<typeof setInterval> = setInterval(() => {
      const { timeRemaining, totalAttempts: currentAttempts } =
        useGameStore.getState();
      if (
        isChallengeComplete(
          challengeType,
          challengeValue,
          currentAttempts,
          timeRemaining,
        )
      ) {
        finishGame();
        clearInterval(timer);
      } else {
        setTimeRemaining(timeRemaining - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    gameStatus,
    challengeType,
    challengeValue,
    finishGame,
    setTimeRemaining,
  ]);
};
