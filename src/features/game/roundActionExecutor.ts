import type { RoundEffect } from "./roundTransition";

interface RoundEffectHandlers {
  playFeedback: (feedback: "correct" | "wrong") => void;
  clearAdvanceTimer: () => void;
  scheduleAdvance: (delayMs: number) => void;
  nextQuestion: () => void;
}

export const executeRoundEffects = (
  effects: RoundEffect[],
  handlers: RoundEffectHandlers,
): void => {
  for (const effect of effects) {
    switch (effect.type) {
      case "play-feedback":
        handlers.playFeedback(effect.feedback);
        break;
      case "clear-advance":
        handlers.clearAdvanceTimer();
        break;
      case "schedule-advance":
        handlers.scheduleAdvance(effect.delayMs);
        break;
      case "advance-round":
        handlers.nextQuestion();
        break;
    }
  }
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
