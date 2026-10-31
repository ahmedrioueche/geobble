import type { GameStateData } from "./gameStateDefaults";
import { createInitialGameState } from "./gameStateDefaults";

type GameSessionData = Pick<
  GameStateData,
  | "score"
  | "streak"
  | "maxStreak"
  | "mode"
  | "pinDirection"
  | "pinLocation"
  | "subMode"
  | "challengeType"
  | "challengeValue"
  | "baseChallengeValue"
  | "timeRemaining"
  | "difficultyStage"
  | "totalLevels"
  | "totalQuestions"
  | "totalAttempts"
  | "correctAttempts"
  | "playedCountryCodes"
  | "sessionPlayedCodes"
  | "gameStatus"
  | "currentCountryCode"
  | "choices"
  | "choiceCodes"
  | "missionId"
  | "revealed"
  | "startTime"
>;

export interface GameSessionSnapshot extends GameSessionData {
  version: 1;
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
    isNonnegativeInteger(value.score) &&
    isNonnegativeInteger(value.streak) &&
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
  state: GameStateData,
): GameSessionSnapshot => ({
  version: 1,
  score: state.score,
  streak: state.streak,
  maxStreak: state.maxStreak,
  mode: state.mode,
  pinDirection: state.pinDirection,
  pinLocation: state.pinLocation ? [...state.pinLocation] : null,
  subMode: state.subMode,
  challengeType: state.challengeType,
  challengeValue: state.challengeValue,
  baseChallengeValue: state.baseChallengeValue,
  timeRemaining: state.timeRemaining,
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
  startTime: state.startTime,
});

export const restoreGameSessionSnapshot = (
  value: unknown,
  unlockedStage: number,
): GameStateData => {
  if (
    !isGameSessionSnapshot(value) ||
    !isNonnegativeInteger(unlockedStage) ||
    unlockedStage < 1
  ) {
    throw new InvalidGameSessionSnapshotError();
  }

  const initialState = createInitialGameState(unlockedStage);
  return {
    ...initialState,
    score: value.score,
    streak: value.streak,
    maxStreak: value.maxStreak,
    mode: value.mode,
    pinDirection: value.pinDirection,
    pinLocation: value.pinLocation ? [...value.pinLocation] : null,
    subMode: value.subMode,
    challengeType: value.challengeType,
    challengeValue: value.challengeValue,
    baseChallengeValue: value.baseChallengeValue,
    timeRemaining: value.timeRemaining,
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
    startTime: value.startTime,
  };
};
