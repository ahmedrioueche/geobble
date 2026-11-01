import type { GameSessionState, GameUiState } from "./gameSession";
import type { RoundTransition } from "./roundTransition";

export interface GameCommandIdentity {
  sessionId: string;
  commandId: number;
  missionId: string;
}

export type GameCommand = GameCommandIdentity &
  (
    | {
        type: "answer";
        answerCountryCode: string | null;
        ignoreIncorrectWhenRevealed?: boolean;
      }
    | { type: "reveal" }
    | { type: "skip" }
  );

export interface GameCommandEvent {
  type: "command-accepted";
  sessionId: string;
  commandId: number;
  missionId: string;
  transition: "outcome" | "advance" | "ignore";
}

export interface GameCommandRejection {
  type: "command-rejected";
  sessionId: string | null;
  commandId: number | null;
  missionId: string | null;
  reason:
    | "malformed"
    | "stale-session"
    | "stale-mission"
    | "duplicate"
    | "inactive";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isGameCommand = (value: unknown): value is GameCommand => {
  if (
    !isRecord(value) ||
    typeof value.sessionId !== "string" ||
    value.sessionId.length === 0 ||
    typeof value.commandId !== "number" ||
    !Number.isSafeInteger(value.commandId) ||
    value.commandId < 1 ||
    typeof value.missionId !== "string" ||
    value.missionId.length === 0
  ) {
    return false;
  }

  if (value.type === "reveal" || value.type === "skip") return true;

  return (
    value.type === "answer" &&
    (value.answerCountryCode === null ||
      (typeof value.answerCountryCode === "string" &&
        value.answerCountryCode.length > 0)) &&
    (value.ignoreIncorrectWhenRevealed === undefined ||
      typeof value.ignoreIncorrectWhenRevealed === "boolean")
  );
};

type RemoveCommandIdentity<Command> = Command extends GameCommandIdentity
  ? Omit<Command, keyof GameCommandIdentity>
  : never;

export type GameCommandInput = GameCommand extends infer Command
  ? Command extends GameCommandIdentity
    ? RemoveCommandIdentity<Command>
    : never
  : never;

export type GameCommandResult =
  | {
      accepted: true;
      event: GameCommandEvent;
      session: GameSessionState;
      ui: GameUiState;
      effects: RoundTransition["effects"];
    }
  | {
      accepted: false;
      event: GameCommandRejection;
      session: GameSessionState;
    };
