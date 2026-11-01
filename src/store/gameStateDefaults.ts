import type { GameSessionState } from "./gameSession";

export interface GameStateData {
  session: GameSessionState;
  unlockedStage: number;
}

export const createInitialGameSession = (): GameSessionState => ({
  id: null,
  lastCommandId: 0,
  timerDeadlineAt: null,
  score: 0,
  streak: 0,
  randomState: 0,
  mode: "identify",
  pinDirection: "locate",
  pinLocation: null,
  subMode: "name",
  challengeType: "world",
  challengeValue: 0,
  timeRemaining: 0,
  difficultyStage: 1,
  totalLevels: 0,
  totalQuestions: 0,
  totalAttempts: 0,
  correctAttempts: 0,
  playedCountryCodes: [],
  sessionPlayedCodes: [],
  gameStatus: "idle",
  currentCountryCode: null,
  choices: [],
  choiceCodes: [],
  missionId: null,
  revealed: false,
  pendingAdvanceAt: null,
  startTime: null,
  maxStreak: 0,
  baseChallengeValue: 0,
});

export const createInitialGameState = (
  unlockedStage = 1,
): GameStateData => ({
  session: createInitialGameSession(),
  unlockedStage,
});
