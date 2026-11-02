import type {
  ChallengeType,
  GameMode,
  PinDirection,
  SubMode,
} from "../../game/domain/gameSession";

export interface RoomConfiguration {
  mode: GameMode;
  pinDirection: PinDirection;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isAdmin: boolean;
  ready: boolean;
  connected: boolean;
  score: number;
  streak: number;
  maxStreak: number;
  pinLocation: [number, number] | null;
  answered: boolean;
}

export interface RoomRound {
  missionId: string;
  number: number;
  prompt: {
    type: "text" | "flag" | "instruction";
    value: string;
    mapAnchor?: [number, number];
  };
  choices: Array<{ id: string; label: string }>;
  revealed: boolean;
  answerReveal: { countryCode: string; countryName: string } | null;
}

export interface RoomSnapshot {
  roomId: string;
  revision: number;
  status: "waiting" | "playing" | "finished";
  adminPlayerId: string;
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  players: RoomPlayer[];
  game: {
    startedAt: number | null;
    timerDeadlineAt: number | null;
    round: RoomRound | null;
  };
}

export type RoomConnectInput =
  | { type: "create"; playerName: string; config?: RoomConfiguration }
  | { type: "join"; roomId: string; playerName: string };

export type RoomCommandInput =
  | {
      type: "answer";
      answerCountryCode: string | null;
      choiceId?: string;
      pinLocation?: [number, number];
    }
  | { type: "reveal" }
  | { type: "skip" };

export type RoomCommand = RoomCommandInput & {
  commandId: number;
  expectedRevision: number;
  missionId: string;
};

export interface RoomJoinedEvent {
  requestId: string;
  playerId: string;
  reconnectToken: string;
  nextCommandId: number;
  snapshot: RoomSnapshot;
}

export type RoomServerEvent =
  | { type: "joined"; payload: RoomJoinedEvent }
  | { type: "updated"; snapshot: RoomSnapshot }
  | {
      type: "command-accepted";
      payload: {
        roomId: string;
        commandId: number;
        revision: number;
        answerResult: boolean | null;
      };
    }
  | {
      type: "command-rejected";
      payload: {
        roomId: string;
        commandId: number | null;
        reason: string;
        revision?: number;
      };
    }
  | {
      type: "settings-accepted";
      payload: { roomId: string; queued: boolean; revision: number };
    }
  | { type: "left"; payload: { roomId: string } }
  | { type: "closed"; payload: { roomId: string } }
  | {
      type: "error";
      payload: { requestId: string | null; message: string };
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isNullableInteger = (value: unknown): value is number | null =>
  value === null || isInteger(value);

const isCoordinate = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "number" &&
  Number.isFinite(value[0]) &&
  value[0] >= -180 &&
  value[0] <= 180 &&
  typeof value[1] === "number" &&
  Number.isFinite(value[1]) &&
  value[1] >= -90 &&
  value[1] <= 90;

const isConfiguration = (value: unknown): value is RoomConfiguration =>
  isRecord(value) &&
  ["identify", "reverse", "pin"].includes(String(value.mode)) &&
  ["locate", "identify"].includes(String(value.pinDirection)) &&
  ["name", "flag", "capital"].includes(String(value.subMode)) &&
  ["world", "count", "timer"].includes(String(value.challengeType)) &&
  isInteger(value.challengeValue);

const isPlayer = (value: unknown): value is RoomPlayer =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.name) &&
  typeof value.isAdmin === "boolean" &&
  typeof value.ready === "boolean" &&
  typeof value.connected === "boolean" &&
  isInteger(value.score) &&
  isInteger(value.streak) &&
  isInteger(value.maxStreak) &&
  (value.pinLocation === null || isCoordinate(value.pinLocation)) &&
  typeof value.answered === "boolean";

const isRound = (value: unknown): value is RoomRound =>
  isRecord(value) &&
  isString(value.missionId) &&
  isInteger(value.number) &&
  isRecord(value.prompt) &&
  ["text", "flag", "instruction"].includes(String(value.prompt.type)) &&
  isString(value.prompt.value) &&
  (value.prompt.mapAnchor === undefined || isCoordinate(value.prompt.mapAnchor)) &&
  Array.isArray(value.choices) &&
  value.choices.every(
    (choice) =>
      isRecord(choice) &&
      isString(choice.id) &&
      isString(choice.label),
  ) &&
  typeof value.revealed === "boolean" &&
  (value.answerReveal === null ||
    (isRecord(value.answerReveal) &&
      isString(value.answerReveal.countryCode) &&
      isString(value.answerReveal.countryName)));

export const isRoomSnapshot = (value: unknown): value is RoomSnapshot =>
  isRecord(value) &&
  isString(value.roomId) &&
  isInteger(value.revision) &&
  ["waiting", "playing", "finished"].includes(String(value.status)) &&
  isString(value.adminPlayerId) &&
  isConfiguration(value.config) &&
  (value.pendingConfig === null || isConfiguration(value.pendingConfig)) &&
  Array.isArray(value.players) &&
  value.players.every(isPlayer) &&
  isRecord(value.game) &&
  isNullableInteger(value.game.startedAt) &&
  isNullableInteger(value.game.timerDeadlineAt) &&
  (value.game.round === null || isRound(value.game.round));

export const isRoomServerEvent = (value: unknown): value is RoomServerEvent => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "updated") return isRoomSnapshot(value.snapshot);
  if (!isRecord(value.payload)) return false;

  const payload = value.payload;
  switch (value.type) {
    case "joined":
      return (
        isString(payload.requestId) &&
        isString(payload.playerId) &&
        isString(payload.reconnectToken) &&
        isInteger(payload.nextCommandId) &&
        isRoomSnapshot(payload.snapshot)
      );
    case "command-accepted":
      return (
        isString(payload.roomId) &&
        isInteger(payload.commandId) &&
        isInteger(payload.revision) &&
        (payload.answerResult === null ||
          typeof payload.answerResult === "boolean")
      );
    case "command-rejected":
      return (
        isString(payload.roomId) &&
        (payload.commandId === null || isInteger(payload.commandId)) &&
        isString(payload.reason) &&
        (payload.revision === undefined || isInteger(payload.revision))
      );
    case "settings-accepted":
      return (
        isString(payload.roomId) &&
        typeof payload.queued === "boolean" &&
        isInteger(payload.revision)
      );
    case "left":
    case "closed":
      return isString(payload.roomId);
    case "error":
      return (
        (payload.requestId === null || isString(payload.requestId)) &&
        isString(payload.message)
      );
    default:
      return false;
  }
};
