import {
  getRoundActionTransition,
  type RoundAction,
  type RoundActionTransition,
} from "./gameRules";

interface RoundActionState {
  score: number;
  streak: number;
  revealed: boolean;
}

interface RoundActionEffects {
  recordAttempt: (isCorrect: boolean) => void;
  playFeedback: (feedback: "correct" | "wrong") => void;
  setFeedback: (
    feedback: "correct" | "wrong",
    clickedName: string,
    clickedCode: string | null,
  ) => void;
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setStreakLost: (streak: number) => void;
  setRevealed: (revealed: boolean) => void;
  clearAdvanceTimer: () => void;
  scheduleAdvance: (delayMs: number) => void;
  nextQuestion: () => void;
}

export const executeRoundAction = (
  action: RoundAction,
  state: RoundActionState,
  clickedName: string,
  clickedCode: string | null,
  effects: RoundActionEffects,
): RoundActionTransition => {
  const transition = getRoundActionTransition(action, state);

  if (transition.kind === "advance") {
    effects.clearAdvanceTimer();
    effects.nextQuestion();
    return transition;
  }
  if (transition.kind === "ignore") return transition;

  if (transition.attemptIsCorrect !== null) {
    effects.recordAttempt(transition.attemptIsCorrect);
  }
  if (transition.feedback) {
    effects.playFeedback(transition.feedback);
    effects.setFeedback(transition.feedback, clickedName, clickedCode);
  }
  effects.setScore(transition.score);
  effects.setStreak(transition.streak);
  if (transition.streakLost !== null) {
    effects.setStreakLost(transition.streakLost);
  }
  effects.setRevealed(transition.revealed);

  if (transition.advanceDelayMs === null) return transition;
  if (transition.advanceDelayMs === 0) {
    effects.clearAdvanceTimer();
    effects.nextQuestion();
    return transition;
  }

  effects.clearAdvanceTimer();
  effects.scheduleAdvance(transition.advanceDelayMs);
  return transition;
};

interface TimeoutController {
  schedule: (delayMs: number, callback: () => void) => void;
  clear: () => void;
}

export const createTimeoutController = (
  setTimer = setTimeout,
  clearTimer = clearTimeout,
): TimeoutController => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  return {
    schedule: (delayMs, callback) => {
      clear();
      timer = setTimer(() => {
        timer = null;
        callback();
      }, delayMs);
    },
    clear,
  };
};
