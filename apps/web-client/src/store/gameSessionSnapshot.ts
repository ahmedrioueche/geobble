import {
  createGameSessionId,
  type GameSessionState,
} from "../features/game/domain/gameSession";
import {
  createInitialGameSession,
  createInitialGameState,
} from "./gameStateDefaults";
import {
  getRemainingSeconds,
  systemGameClock,
} from "../features/game/domain/gameClock";

export const GAME_SESSION_STORAGE_KEY = "geobble-active-session";

type GameSessionData = Omit<
  GameSessionState,
  "id" | "lastCommandId" | "timerDeadlineAt"
> & {
  id?: string | null;
  lastCommandId?: number;
  timerDeadlineAt?: number | null;
};

export interface GameSessionSnapshot extends GameSessionData {
  version: 1;
  savedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] => typeof value === "string" && values.includes(value);

const isNonnegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isNonnegativeInteger = (value: unknown): value is number =>
  isNonnegativeNumber(value) && Number.isInteger(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isPinLocation = (
  value: unknown,
): value is [number, number] | null =>
  value === null ||
  (Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90);

const isGameSessionSnapshot = (
  value: unknown,
): value is GameSessionSnapshot => {
  if (!isRecord(value) || value.version !== 1) return false;

  return (
    isNonnegativeNumber(value.savedAt) &&
    (value.id === undefined ||
      value.id === null ||
      (typeof value.id === "string" && value.id.length > 0)) &&
    (value.lastCommandId === undefined ||
      (typeof value.lastCommandId === "number" &&
        Number.isSafeInteger(value.lastCommandId) &&
        value.lastCommandId >= 0)) &&
    (value.timerDeadlineAt === undefined ||
      value.timerDeadlineAt === null ||
      isNonnegativeNumber(value.timerDeadlineAt)) &&
    isNonnegativeInteger(value.score) &&
    isNonnegativeInteger(value.streak) &&
    isNonnegativeInteger(value.randomState) &&
    value.randomState <= 0xffffffff &&
    isNonnegativeInteger(value.maxStreak) &&
    isOneOf(value.mode, ["identify", "reverse", "pin"] as const) &&
    isOneOf(value.pinDirection, ["locate", "identify"] as const) &&
    isPinLocation(value.pinLocation) &&
    isOneOf(value.subMode, ["name", "flag", "capital"] as const) &&
    isOneOf(value.challengeType, ["world", "count", "timer"] as const) &&
    isNonnegativeNumber(value.challengeValue) &&
    isNonnegativeNumber(value.baseChallengeValue) &&
    isNonnegativeNumber(value.timeRemaining) &&
    isNonnegativeInteger(value.difficultyStage) &&
    value.difficultyStage >= 1 &&
    isNonnegativeInteger(value.totalLevels) &&
    isNonnegativeInteger(value.totalQuestions) &&
    isNonnegativeInteger(value.totalAttempts) &&
    isNonnegativeInteger(value.correctAttempts) &&
    value.correctAttempts <= value.totalAttempts &&
    isStringArray(value.playedCountryCodes) &&
    isStringArray(value.sessionPlayedCodes) &&
    isOneOf(value.gameStatus, ["idle", "playing", "finished"] as const) &&
    isNullableString(value.currentCountryCode) &&
    isStringArray(value.choices) &&
    isStringArray(value.choiceCodes) &&
    isNullableString(value.missionId) &&
    typeof value.revealed === "boolean" &&
    (value.pendingAdvanceAt === null ||
      isNonnegativeNumber(value.pendingAdvanceAt)) &&
    (value.startTime === null || isNonnegativeNumber(value.startTime))
  );
};

export class InvalidGameSessionSnapshotError extends Error {
  constructor() {
    super("Invalid or unsupported game session snapshot");
    this.name = "InvalidGameSessionSnapshotError";
  }
}

export const createGameSessionSnapshot = (
  state: GameSessionState,
  savedAt = systemGameClock(),
): GameSessionSnapshot => {
  const isActiveTimer =
    state.challengeType === "timer" && state.gameStatus === "playing";
  const timerDeadlineAt = isActiveTimer
    ? (state.timerDeadlineAt ??
      savedAt + state.timeRemaining * 1000)
    : state.timerDeadlineAt;

  return {
    version: 1,
    savedAt,
    id: state.id,
    lastCommandId: state.lastCommandId,
    timerDeadlineAt,
    score: state.score,
    streak: state.streak,
    randomState: state.randomState,
    maxStreak: state.maxStreak,
    mode: state.mode,
    pinDirection: state.pinDirection,
    pinLocation: state.pinLocation ? [...state.pinLocation] : null,
    subMode: state.subMode,
    challengeType: state.challengeType,
    challengeValue: state.challengeValue,
    baseChallengeValue: state.baseChallengeValue,
    timeRemaining:
      isActiveTimer && timerDeadlineAt !== null
        ? getRemainingSeconds(timerDeadlineAt, savedAt)
        : state.timeRemaining,
    difficultyStage: state.difficultyStage,
    totalLevels: state.totalLevels,
    totalQuestions: state.totalQuestions,
    totalAttempts: state.totalAttempts,
    correctAttempts: state.correctAttempts,
    playedCountryCodes: [...state.playedCountryCodes],
    sessionPlayedCodes: [...state.sessionPlayedCodes],
    gameStatus: state.gameStatus,
    currentCountryCode: state.currentCountryCode,
    choices: [...state.choices],
    choiceCodes: [...state.choiceCodes],
    missionId: state.missionId,
    revealed: state.revealed,
    pendingAdvanceAt: state.pendingAdvanceAt,
    startTime: state.startTime,
  };
};

export const restoreGameSessionSnapshot = (
  value: unknown,
  unlockedStage: number,
  now = systemGameClock(),
): ReturnType<typeof createInitialGameState> => {
  if (
    !isGameSessionSnapshot(value) ||
    !isNonnegativeInteger(unlockedStage) ||
    unlockedStage < 1 ||
    !isNonnegativeNumber(now)
  ) {
    throw new InvalidGameSessionSnapshotError();
  }

  const session = createInitialGameSession();
  const isActiveTimer =
    value.challengeType === "timer" && value.gameStatus === "playing";
  const timerDeadlineAt =
    value.timerDeadlineAt === undefined || value.timerDeadlineAt === null
      ? isActiveTimer
        ? value.savedAt + value.timeRemaining * 1000
        : null
      : value.timerDeadlineAt;
  return {
    unlockedStage,
    session: {
      ...session,
      id:
        value.id ??
        (value.gameStatus === "playing" ? createGameSessionId() : null),
      lastCommandId: value.lastCommandId ?? 0,
      timerDeadlineAt,
      score: value.score,
      streak: value.streak,
      randomState: value.randomState,
      maxStreak: value.maxStreak,
      mode: value.mode,
      pinDirection: value.pinDirection,
      pinLocation: value.pinLocation ? [...value.pinLocation] : null,
      subMode: value.subMode,
      challengeType: value.challengeType,
      challengeValue: value.challengeValue,
      baseChallengeValue: value.baseChallengeValue,
      timeRemaining:
        isActiveTimer && timerDeadlineAt !== null
          ? getRemainingSeconds(timerDeadlineAt, now)
          : value.timeRemaining,
      difficultyStage: value.difficultyStage,
      totalLevels: value.totalLevels,
      totalQuestions: value.totalQuestions,
      totalAttempts: value.totalAttempts,
      correctAttempts: value.correctAttempts,
      playedCountryCodes: [...value.playedCountryCodes],
      sessionPlayedCodes: [...value.sessionPlayedCodes],
      gameStatus: value.gameStatus,
      currentCountryCode: value.currentCountryCode,
      choices: [...value.choices],
      choiceCodes: [...value.choiceCodes],
      missionId: value.missionId,
      revealed: value.revealed,
      pendingAdvanceAt: value.pendingAdvanceAt,
      startTime: value.startTime,
    },
  };
};
