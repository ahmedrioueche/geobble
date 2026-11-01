import type { GameSessionState, GameUiState } from "./gameSession";
import {
  getRoundActionTransition,
  type RoundAction,
} from "./gameRules";

export type RoundSessionState = Pick<
  GameSessionState,
  | "score"
  | "streak"
  | "maxStreak"
  | "totalAttempts"
  | "correctAttempts"
  | "revealed"
>;

export type RoundUiState = Pick<
  GameUiState,
  "feedback" | "clickedName" | "clickedCode" | "streakLost"
>;

export type RoundEffect =
  | { type: "play-feedback"; feedback: "correct" | "wrong" }
  | { type: "clear-advance" }
  | { type: "schedule-advance"; delayMs: number }
  | { type: "advance-round" };

export interface RoundTransition {
  kind: "outcome" | "advance" | "ignore";
  state: RoundSessionState;
  ui: RoundUiState;
  effects: RoundEffect[];
}

export const transitionRoundAction = (
  action: RoundAction,
  state: RoundSessionState,
  ui: RoundUiState,
  clickedName: string,
  clickedCode: string | null = null,
): RoundTransition => {
  const outcome = getRoundActionTransition(action, state);

  if (outcome.kind === "advance") {
    return {
      kind: outcome.kind,
      state,
      ui,
      effects: [{ type: "clear-advance" }, { type: "advance-round" }],
    };
  }

  if (outcome.kind === "ignore") {
    return { kind: outcome.kind, state, ui, effects: [] };
  }

  const nextState: RoundSessionState = {
    ...state,
    score: outcome.score,
    streak: outcome.streak,
    maxStreak: Math.max(state.maxStreak, outcome.streak),
    totalAttempts:
      state.totalAttempts + (outcome.attemptIsCorrect === null ? 0 : 1),
    correctAttempts:
      state.correctAttempts + (outcome.attemptIsCorrect === true ? 1 : 0),
    revealed: outcome.revealed,
  };
  const nextUi: RoundUiState = {
    ...ui,
    ...(outcome.feedback
      ? {
          feedback: outcome.feedback,
          clickedName,
          clickedCode,
        }
      : {}),
    ...(outcome.streakLost === null
      ? {}
      : { streakLost: outcome.streakLost }),
  };
  const effects: RoundEffect[] = [];

  if (outcome.feedback) {
    effects.push({ type: "play-feedback", feedback: outcome.feedback });
  }

  if (outcome.advanceDelayMs !== null) {
    effects.push({ type: "clear-advance" });
    effects.push(
      outcome.advanceDelayMs === 0
        ? { type: "advance-round" }
        : { type: "schedule-advance", delayMs: outcome.advanceDelayMs },
    );
  }

  return { kind: outcome.kind, state: nextState, ui: nextUi, effects };
};
