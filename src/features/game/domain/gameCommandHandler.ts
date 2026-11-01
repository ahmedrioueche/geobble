import type { GameSessionState, GameUiState } from "./gameSession";
import {
  transitionRoundAction,
  type RoundSessionState,
  type RoundUiState,
} from "./roundTransition";
import {
  isGameCommand,
  type GameCommand,
  type GameCommandRejection,
  type GameCommandResult,
} from "./gameProtocol";

const getRejectionIdentity = (
  command: unknown,
): Pick<GameCommandRejection, "sessionId" | "commandId" | "missionId"> => {
  if (typeof command !== "object" || command === null) {
    return { sessionId: null, commandId: null, missionId: null };
  }

  const record = command as Record<string, unknown>;
  return {
    sessionId: typeof record.sessionId === "string" ? record.sessionId : null,
    commandId:
      typeof record.commandId === "number" &&
      Number.isSafeInteger(record.commandId)
        ? record.commandId
        : null,
    missionId: typeof record.missionId === "string" ? record.missionId : null,
  };
};

const reject = (
  command: unknown,
  reason: GameCommandRejection["reason"],
  session: GameSessionState,
): GameCommandResult => ({
  accepted: false,
  event: {
    type: "command-rejected",
    ...getRejectionIdentity(command),
    reason,
  },
  session,
});

export interface GameCommandContext {
  session: GameSessionState;
  ui: GameUiState;
}

export interface LocalCommandMetadata {
  clickedName?: string;
  clickedCode?: string | null;
}

const getRoundState = (session: GameSessionState): RoundSessionState => ({
  score: session.score,
  streak: session.streak,
  maxStreak: session.maxStreak,
  totalAttempts: session.totalAttempts,
  correctAttempts: session.correctAttempts,
  revealed: session.revealed,
});

const getRoundUiState = (ui: GameUiState): RoundUiState => ({
  feedback: ui.feedback,
  clickedName: ui.clickedName,
  clickedCode: ui.clickedCode,
  streakLost: ui.streakLost,
});

export const handleGameCommand = (
  commandValue: unknown,
  context: GameCommandContext,
  metadata: LocalCommandMetadata = {},
): GameCommandResult => {
  if (!isGameCommand(commandValue)) {
    return reject(commandValue, "malformed", context.session);
  }

  const command: GameCommand = commandValue;
  if (command.commandId <= context.session.lastCommandId) {
    return reject(command, "duplicate", context.session);
  }
  if (command.sessionId !== context.session.id) {
    return reject(command, "stale-session", context.session);
  }
  if (command.missionId !== context.session.missionId) {
    return reject(command, "stale-mission", context.session);
  }
  if (
    context.session.gameStatus !== "playing" ||
    context.session.currentCountryCode === null
  ) {
    return reject(command, "inactive", context.session);
  }

  let action: Parameters<typeof transitionRoundAction>[0];
  if (command.type === "answer") {
    action = {
      type: "answer",
      isCorrect: command.answerCountryCode === context.session.currentCountryCode,
      ignoreIncorrectWhenRevealed:
        command.ignoreIncorrectWhenRevealed ?? false,
    };
  } else if (command.type === "reveal") {
    action = {
      type: "reveal",
      loseStreak: context.session.mode === "identify",
    };
  } else {
    action = { type: "skip" };
  }

  const transition = transitionRoundAction(
    action,
    getRoundState(context.session),
    getRoundUiState(context.ui),
    metadata.clickedName ?? "",
    metadata.clickedCode ?? null,
  );
  const nextSession: GameSessionState = {
    ...context.session,
    ...transition.state,
    lastCommandId: command.commandId,
  };
  const nextUi: GameUiState = {
    ...context.ui,
    ...transition.ui,
  };
  const event = {
    type: "command-accepted",
    sessionId: command.sessionId,
    commandId: command.commandId,
    missionId: command.missionId,
    transition: transition.kind,
  } as const;

  return {
    accepted: true,
    event,
    session: nextSession,
    ui: nextUi,
    effects: transition.effects,
  };
};
