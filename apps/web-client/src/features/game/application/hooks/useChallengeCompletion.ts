import { useEffect } from "react";
import { useGameStore } from "../../../../store/useGameStore";
import {
  getRemainingSeconds,
  systemGameClock,
  type GameClock,
} from "../../domain/gameClock";
import { isCountChallengeComplete } from "../../domain/gameRules";

interface UseChallengeCompletionProps {
  gameStatus: "idle" | "playing" | "finished";
  challengeType: "world" | "count" | "timer";
  challengeValue: number;
  totalAttempts: number;
  timerDeadlineAt: number | null;
  finishGame: () => void;
  setTimeRemaining: (time: number) => void;
  clock?: GameClock;
}

export const useChallengeCompletion = ({
  gameStatus,
  challengeType,
  challengeValue,
  totalAttempts,
  timerDeadlineAt,
  finishGame,
  setTimeRemaining,
  clock = systemGameClock,
}: UseChallengeCompletionProps) => {
  useEffect(() => {
    if (
      gameStatus === "playing" &&
      isCountChallengeComplete(challengeType, challengeValue, totalAttempts)
    ) {
      const timer = setTimeout(() => {
        if (useGameStore.getState().session.gameStatus === "playing") {
          finishGame();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, challengeType, totalAttempts, challengeValue, finishGame]);

  useEffect(() => {
    if (
      gameStatus !== "playing" ||
      challengeType !== "timer" ||
      timerDeadlineAt === null
    ) {
      return;
    }

    const updateTimeRemaining = () => {
      const currentSession = useGameStore.getState().session;
      if (
        currentSession.gameStatus !== "playing" ||
        currentSession.timerDeadlineAt !== timerDeadlineAt
      ) {
        return;
      }

      const remaining = getRemainingSeconds(timerDeadlineAt, clock());
      setTimeRemaining(remaining);
      if (remaining === 0) {
        finishGame();
      }
    };

    updateTimeRemaining();
    if (getRemainingSeconds(timerDeadlineAt, clock()) === 0) return;

    const timer: ReturnType<typeof setInterval> = setInterval(
      updateTimeRemaining,
      1000,
    );
    const deadlineTimer: ReturnType<typeof setTimeout> = setTimeout(
      updateTimeRemaining,
      Math.max(0, timerDeadlineAt - clock()),
    );

    return () => {
      clearInterval(timer);
      clearTimeout(deadlineTimer);
    };
  }, [
    gameStatus,
    challengeType,
    timerDeadlineAt,
    finishGame,
    setTimeRemaining,
    clock,
  ]);
};
