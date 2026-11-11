import type {
  ChallengeType,
  GameMode,
  PinDirection,
  SubMode,
} from "../../game/domain/gameSession";

export type PowerUpKind = "fifty" | "hint" | "double" | "freeze";

export type DifficultyTier = "easy" | "medium" | "hard" | "expert";
export type DifficultyMode = "progressive" | DifficultyTier;

export type ReactionEmoji = "🔥" | "👏" | "😱" | "😂" | "🎯" | "💀";

export const REACTION_EMOJIS: readonly ReactionEmoji[] = [
  "🔥",
  "👏",
  "😱",
  "😂",
  "🎯",
  "💀",
];

export interface PlayerPowerUps {
  fifty: boolean;
  hint: boolean;
  double: boolean;
  freeze: boolean;
}

export interface RoomConfiguration {
  mode: GameMode;
  pinDirection: PinDirection;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
  endless?: boolean;
  difficulty?: DifficultyMode;
  roundTimeLimitSeconds?: number;
  speedScoring?: boolean;
  wrongAnswerPenalty?: number;
}

export interface CheckpointSummary {
  legNumber: number;
  roundsInLeg: number;
  winnerIds: string[];
  topLegScore: number;
  nextLegNumber: number;
  nextLegTier: DifficultyTier;
  nextLegMultiplier: number;
  lapNumber: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isAdmin: boolean;
  connected: boolean;
  paused?: boolean;
  spectatorPromptDeadlineAt?: number | null;
  score: number;
  legScore?: number;
  checkpointsWon?: number;
  streak: number;
  maxStreak: number;
  pinLocation: [number, number] | null;
  answered: boolean;
  lockedOut?: boolean;
  powerUps?: PlayerPowerUps;
  doubleActive?: boolean;
  hiddenChoiceIds?: string[];
  hint?: string | null;
}

export interface RoundResultPlayer {
  playerId: string;
  correct: boolean;
  elapsedMs: number;
  pointsGained: number;
  streakBonus?: number;
  streakAfter: number;
  distanceKm?: number | null;
}

export interface RoundResult {
  fastestPlayerId: string | null;
  closestPinPlayerId?: string | null;
  closestPinDistanceKm?: number | null;
  players: RoundResultPlayer[];
}

export interface RoomRound {
  missionId: string;
  number: number;
  difficultyTier?: DifficultyTier;
  prompt: {
    type: "text" | "flag" | "instruction";
    value: string;
    flagCode?: string;
    mapAnchor?: [number, number];
  };
  choices: Array<{ id: string; label: string; flagCode?: string }>;
  revealed: boolean;
  answerReveal: { countryCode: string; countryName: string } | null;
  startedAt?: number | null;
  deadlineAt?: number | null;
  result?: RoundResult | null;
}

export interface RoomSnapshot {
  roomId: string;
  revision: number;
  status: "waiting" | "playing" | "checkpoint" | "finished";
  visibility: "public" | "private";
  adminPlayerId: string;
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  players: RoomPlayer[];
  game: {
    startedAt: number | null;
    timerDeadlineAt: number | null;
    legNumber?: number;
    legRoundNumber?: number;
    lapNumber?: number;
    legMultiplier?: number;
    legTier?: DifficultyTier;
    checkpointResumeAt?: number | null;
    checkpointPaused?: boolean;
    checkpointSummary?: CheckpointSummary | null;
    paused?: boolean;
    pauseDeadlineAt?: number | null;
    round: RoomRound | null;
  };
}

export type RoomConnectInput =
  | {
    type: "create";
    playerName: string;
    visibility: "public" | "private";
    secret?: string;
    config?: RoomConfiguration;
  }
  | { type: "matchmake"; playerName: string }
  | { type: "join"; roomId: string; playerName: string; secret?: string };

export interface RoomInspectResult {
  requestId: string;
  roomId: string;
  visibility: "public" | "private";
  status: "waiting" | "playing" | "checkpoint" | "finished";
  playerCount: number;
  maxPlayers: number;
  requiresSecret: boolean;
}

export type RoomCommandInput =
  | {
    type: "answer";
    answerCountryCode: string | null;
    choiceId?: string;
    pinLocation?: [number, number];
  }
  | {
    type: "powerup";
    kind: PowerUpKind;
  }
  | { type: "reveal" }
  | { type: "skip" };

export interface RoomReactionEvent {
  roomId: string;
  playerId: string;
  playerName: string;
  emoji: ReactionEmoji;
  timestamp: number;
}

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
  roomSecret?: string;
}

export type RoomErrorCode =
  | "INVALID_REQUEST"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_NOT_JOINABLE"
  | "ROOM_NOT_STARTABLE"
  | "ROUND_UNAVAILABLE"
  | "NOT_ADMIN"
  | "NOT_CONNECTED"
  | "NOT_AUTHORIZED"
  | "SECRET_REQUIRED"
  | "INVALID_SECRET"
  | "STALE_REVISION"
  | "STALE_MISSION"
  | "DUPLICATE_COMMAND"
  | "INVALID_COMMAND"
  | "ROOM_EXPIRED"
  | "RATE_LIMITED";

export type RoomServerEvent =
  | { type: "joined"; payload: RoomJoinedEvent }
  | { type: "inspected"; payload: RoomInspectResult }
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
    payload: {
      requestId: string;
      roomId: string;
      queued: boolean;
      revision: number;
    };
  }
  | { type: "left"; payload: { roomId: string; reason?: "inactivity" } }
  | { type: "closed"; payload: { roomId: string; reason?: "inactivity" } }
  | { type: "reaction"; payload: RoomReactionEvent }
  | {
    type: "error";
    payload: {
      requestId: string | null;
      message: string;
      code?: RoomErrorCode;
    };
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isRoomErrorCode = (value: unknown): value is RoomErrorCode =>
  [
    "INVALID_REQUEST",
    "ROOM_NOT_FOUND",
    "ROOM_FULL",
    "ROOM_NOT_JOINABLE",
    "ROOM_NOT_STARTABLE",
    "ROUND_UNAVAILABLE",
    "NOT_ADMIN",
    "NOT_CONNECTED",
    "NOT_AUTHORIZED",
    "SECRET_REQUIRED",
    "INVALID_SECRET",
    "STALE_REVISION",
    "STALE_MISSION",
    "DUPLICATE_COMMAND",
    "INVALID_COMMAND",
    "ROOM_EXPIRED",
    "RATE_LIMITED",
  ].includes(String(value));

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
  isInteger(value.challengeValue) &&
  (value.endless === undefined || typeof value.endless === "boolean") &&
  (value.difficulty === undefined ||
    ["progressive", "easy", "medium", "hard", "expert"].includes(
      String(value.difficulty),
    )) &&
  (value.roundTimeLimitSeconds === undefined ||
    isInteger(value.roundTimeLimitSeconds)) &&
  (value.speedScoring === undefined ||
    typeof value.speedScoring === "boolean") &&
  (value.wrongAnswerPenalty === undefined ||
    isInteger(value.wrongAnswerPenalty));

const isPowerUps = (value: unknown): value is PlayerPowerUps =>
  isRecord(value) &&
  typeof value.fifty === "boolean" &&
  typeof value.hint === "boolean" &&
  typeof value.double === "boolean" &&
  typeof value.freeze === "boolean";

const isPlayer = (value: unknown): value is RoomPlayer =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.name) &&
  typeof value.isAdmin === "boolean" &&
  typeof value.connected === "boolean" &&
  (value.paused === undefined || typeof value.paused === "boolean") &&
  (value.spectatorPromptDeadlineAt === undefined ||
    isNullableInteger(value.spectatorPromptDeadlineAt)) &&
  isInteger(value.score) &&
  (value.legScore === undefined || isInteger(value.legScore)) &&
  (value.checkpointsWon === undefined || isInteger(value.checkpointsWon)) &&
  isInteger(value.streak) &&
  isInteger(value.maxStreak) &&
  (value.pinLocation === null || isCoordinate(value.pinLocation)) &&
  typeof value.answered === "boolean" &&
  (value.lockedOut === undefined || typeof value.lockedOut === "boolean") &&
  (value.powerUps === undefined || isPowerUps(value.powerUps)) &&
  (value.doubleActive === undefined ||
    typeof value.doubleActive === "boolean") &&
  (value.hiddenChoiceIds === undefined ||
    (Array.isArray(value.hiddenChoiceIds) &&
      value.hiddenChoiceIds.every(isString))) &&
  (value.hint === undefined || value.hint === null || isString(value.hint));

const isRoundResult = (value: unknown): value is RoundResult =>
  isRecord(value) &&
  (value.fastestPlayerId === null || isString(value.fastestPlayerId)) &&
  (value.closestPinPlayerId === undefined ||
    value.closestPinPlayerId === null ||
    isString(value.closestPinPlayerId)) &&
  (value.closestPinDistanceKm === undefined ||
    isNullableInteger(value.closestPinDistanceKm)) &&
  Array.isArray(value.players) &&
  value.players.every(
    (player) =>
      isRecord(player) &&
      isString(player.playerId) &&
      typeof player.correct === "boolean" &&
      isInteger(player.elapsedMs) &&
      isInteger(player.pointsGained) &&
      (player.streakBonus === undefined || isInteger(player.streakBonus)) &&
      isInteger(player.streakAfter) &&
      (player.distanceKm === undefined || isNullableInteger(player.distanceKm)),
  );

const isRound = (value: unknown): value is RoomRound =>
  isRecord(value) &&
  isString(value.missionId) &&
  isInteger(value.number) &&
  (value.difficultyTier === undefined ||
    ["easy", "medium", "hard", "expert"].includes(
      String(value.difficultyTier),
    )) &&
  isRecord(value.prompt) &&
  ["text", "flag", "instruction"].includes(String(value.prompt.type)) &&
  isString(value.prompt.value) &&
  (value.prompt.flagCode === undefined || isString(value.prompt.flagCode)) &&
  (value.prompt.mapAnchor === undefined || isCoordinate(value.prompt.mapAnchor)) &&
  Array.isArray(value.choices) &&
  value.choices.every(
    (choice) =>
      isRecord(choice) &&
      isString(choice.id) &&
      isString(choice.label) &&
      (choice.flagCode === undefined || isString(choice.flagCode)),
  ) &&
  typeof value.revealed === "boolean" &&
  (value.answerReveal === null ||
    (isRecord(value.answerReveal) &&
      isString(value.answerReveal.countryCode) &&
      isString(value.answerReveal.countryName))) &&
  (value.startedAt === undefined || isNullableInteger(value.startedAt)) &&
  (value.deadlineAt === undefined || isNullableInteger(value.deadlineAt)) &&
  (value.result === undefined ||
    value.result === null ||
    isRoundResult(value.result));

const isDifficultyTier = (value: unknown): value is DifficultyTier =>
  ["easy", "medium", "hard", "expert"].includes(String(value));

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isCheckpointSummary = (value: unknown): value is CheckpointSummary =>
  isRecord(value) &&
  isInteger(value.legNumber) &&
  isInteger(value.roundsInLeg) &&
  Array.isArray(value.winnerIds) &&
  value.winnerIds.every(isString) &&
  isInteger(value.topLegScore) &&
  isInteger(value.nextLegNumber) &&
  isDifficultyTier(value.nextLegTier) &&
  isNumber(value.nextLegMultiplier) &&
  isInteger(value.lapNumber);

export const isRoomSnapshot = (value: unknown): value is RoomSnapshot =>
  isRecord(value) &&
  isString(value.roomId) &&
  isInteger(value.revision) &&
  ["waiting", "playing", "checkpoint", "finished"].includes(String(value.status)) &&
  ["public", "private"].includes(String(value.visibility)) &&
  isString(value.adminPlayerId) &&
  isConfiguration(value.config) &&
  (value.pendingConfig === null || isConfiguration(value.pendingConfig)) &&
  Array.isArray(value.players) &&
  value.players.every(isPlayer) &&
  isRecord(value.game) &&
  isNullableInteger(value.game.startedAt) &&
  isNullableInteger(value.game.timerDeadlineAt) &&
  (value.game.legNumber === undefined || isInteger(value.game.legNumber)) &&
  (value.game.legRoundNumber === undefined ||
    isInteger(value.game.legRoundNumber)) &&
  (value.game.lapNumber === undefined || isInteger(value.game.lapNumber)) &&
  (value.game.legMultiplier === undefined ||
    isNumber(value.game.legMultiplier)) &&
  (value.game.legTier === undefined || isDifficultyTier(value.game.legTier)) &&
  (value.game.checkpointResumeAt === undefined ||
    isNullableInteger(value.game.checkpointResumeAt)) &&
  (value.game.checkpointPaused === undefined ||
    typeof value.game.checkpointPaused === "boolean") &&
  (value.game.checkpointSummary === undefined ||
    value.game.checkpointSummary === null ||
    isCheckpointSummary(value.game.checkpointSummary)) &&
  (value.game.paused === undefined || typeof value.game.paused === "boolean") &&
  (value.game.pauseDeadlineAt === undefined ||
    isNullableInteger(value.game.pauseDeadlineAt)) &&
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
        isRoomSnapshot(payload.snapshot) &&
        (payload.roomSecret === undefined || isString(payload.roomSecret))
      );
    case "inspected":
      return (
        isString(payload.requestId) &&
        isString(payload.roomId) &&
        ["public", "private"].includes(String(payload.visibility)) &&
        ["waiting", "playing", "checkpoint", "finished"].includes(
          String(payload.status),
        ) &&
        isInteger(payload.playerCount) &&
        isInteger(payload.maxPlayers) &&
        typeof payload.requiresSecret === "boolean"
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
        isString(payload.requestId) &&
        isString(payload.roomId) &&
        typeof payload.queued === "boolean" &&
        isInteger(payload.revision)
      );
    case "left":
    case "closed":
      return (
        isString(payload.roomId) &&
        (payload.reason === undefined || payload.reason === "inactivity")
      );
    case "reaction":
      return (
        isString(payload.roomId) &&
        isString(payload.playerId) &&
        isString(payload.playerName) &&
        REACTION_EMOJIS.includes(payload.emoji as ReactionEmoji) &&
        isInteger(payload.timestamp)
      );
    case "error":
      return (
        (payload.requestId === null || isString(payload.requestId)) &&
        isString(payload.message) &&
        (payload.code === undefined || isRoomErrorCode(payload.code))
      );
    default:
      return false;
  }
};
