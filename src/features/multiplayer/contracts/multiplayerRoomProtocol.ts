import type { GameSessionState } from "../../game/domain/gameSession";

export type RoomGameState = Pick<
  GameSessionState,
  | "mode"
  | "pinDirection"
  | "subMode"
  | "challengeType"
  | "challengeValue"
  | "timeRemaining"
  | "score"
  | "streak"
  | "maxStreak"
  | "totalQuestions"
  | "totalAttempts"
  | "correctAttempts"
  | "gameStatus"
  | "currentCountryCode"
  | "choices"
  | "choiceCodes"
  | "missionId"
  | "revealed"
  | "pinLocation"
>;

export interface RoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomSnapshot {
  roomId: string;
  revision: number;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  game: RoomGameState;
}

export type RoomRequest =
  | { type: "create-room"; requestId: string; playerName: string }
  | {
      type: "join-room";
      requestId: string;
      roomId: string;
      playerName: string;
    };

export type RoomCommandInput =
  | {
      type: "answer";
      answerCountryCode: string | null;
    }
  | { type: "reveal" }
  | { type: "skip" };

export type RoomCommand = RoomCommandInput & {
  commandId: number;
  expectedRevision: number;
  missionId: string;
};

export type RoomServerMessage =
  | {
      type: "room-joined";
      requestId: string;
      playerId: string;
      snapshot: RoomSnapshot;
    }
  | { type: "room-updated"; snapshot: RoomSnapshot }
  | {
      type: "command-accepted";
      roomId: string;
      commandId: number;
      revision: number;
    }
  | {
      type: "command-rejected";
      roomId: string;
      commandId: number;
      reason:
        | "invalid-command"
        | "stale-revision"
        | "stale-mission"
        | "duplicate"
        | "not-allowed";
    }
  | {
      type: "room-error";
      requestId: string | null;
      message: string;
    }
  | { type: "room-left"; roomId: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isNonnegativeInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isRoomGameState = (value: unknown): value is RoomGameState => {
  if (!isRecord(value)) return false;
  return (
    ["identify", "reverse", "pin"].includes(String(value.mode)) &&
    ["locate", "identify"].includes(String(value.pinDirection)) &&
    ["name", "flag", "capital"].includes(String(value.subMode)) &&
    ["world", "count", "timer"].includes(String(value.challengeType)) &&
    typeof value.challengeValue === "number" &&
    Number.isFinite(value.challengeValue) &&
    value.challengeValue >= 0 &&
    typeof value.timeRemaining === "number" &&
    Number.isFinite(value.timeRemaining) &&
    value.timeRemaining >= 0 &&
    isNonnegativeInteger(value.score) &&
    isNonnegativeInteger(value.streak) &&
    isNonnegativeInteger(value.maxStreak) &&
    isNonnegativeInteger(value.totalQuestions) &&
    isNonnegativeInteger(value.totalAttempts) &&
    isNonnegativeInteger(value.correctAttempts) &&
    value.correctAttempts <= value.totalAttempts &&
    ["idle", "playing", "finished"].includes(String(value.gameStatus)) &&
    isNullableString(value.currentCountryCode) &&
    isStringArray(value.choices) &&
    isStringArray(value.choiceCodes) &&
    (value.missionId === null || isNonemptyString(value.missionId)) &&
    typeof value.revealed === "boolean" &&
    (value.pinLocation === null ||
      (Array.isArray(value.pinLocation) &&
        value.pinLocation.length === 2 &&
        typeof value.pinLocation[0] === "number" &&
        Number.isFinite(value.pinLocation[0]) &&
        value.pinLocation[0] >= -180 &&
        value.pinLocation[0] <= 180 &&
        typeof value.pinLocation[1] === "number" &&
        Number.isFinite(value.pinLocation[1]) &&
        value.pinLocation[1] >= -90 &&
        value.pinLocation[1] <= 90))
  );
};

const isRoomPlayer = (value: unknown): value is RoomPlayer =>
  isRecord(value) &&
  isNonemptyString(value.id) &&
  typeof value.name === "string" &&
  typeof value.ready === "boolean" &&
  typeof value.connected === "boolean";

export const isRoomSnapshot = (value: unknown): value is RoomSnapshot =>
  isRecord(value) &&
  isNonemptyString(value.roomId) &&
  isNonnegativeInteger(value.revision) &&
  ["waiting", "playing", "finished"].includes(String(value.status)) &&
  Array.isArray(value.players) &&
  value.players.every(isRoomPlayer) &&
  isRoomGameState(value.game);

export const isRoomRequest = (value: unknown): value is RoomRequest => {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.requestId) ||
    !isNonemptyString(value.playerName)
  ) {
    return false;
  }
  if (value.type === "create-room") return true;
  return (
    value.type === "join-room" &&
    isNonemptyString(value.roomId)
  );
};

export const isRoomCommand = (value: unknown): value is RoomCommand => {
  if (
    !isRecord(value) ||
    !isNonnegativeInteger(value.commandId) ||
    value.commandId < 1 ||
    !isNonnegativeInteger(value.expectedRevision) ||
    !isNonemptyString(value.missionId)
  ) {
    return false;
  }
  if (value.type === "reveal" || value.type === "skip") return true;
  return (
    value.type === "answer" &&
    (value.answerCountryCode === null ||
      isNonemptyString(value.answerCountryCode))
  );
};

export const isRoomServerMessage = (
  value: unknown,
): value is RoomServerMessage => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "room-joined":
      return (
        isNonemptyString(value.requestId) &&
        isNonemptyString(value.playerId) &&
        isRoomSnapshot(value.snapshot)
      );
    case "room-updated":
      return isRoomSnapshot(value.snapshot);
    case "command-accepted":
      return (
        isNonemptyString(value.roomId) &&
        isNonnegativeInteger(value.commandId) &&
        isNonnegativeInteger(value.revision)
      );
    case "command-rejected":
      return (
        isNonemptyString(value.roomId) &&
        isNonnegativeInteger(value.commandId) &&
        [
          "invalid-command",
          "stale-revision",
          "stale-mission",
          "duplicate",
          "not-allowed",
        ].includes(String(value.reason))
      );
    case "room-error":
      return (
        (value.requestId === null || isNonemptyString(value.requestId)) &&
        typeof value.message === "string"
      );
    case "room-left":
      return isNonemptyString(value.roomId);
    default:
      return false;
  }
};
