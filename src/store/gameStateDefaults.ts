import type {
  ChallengeType,
  GameMode,
  PinDirection,
  SubMode,
} from "./useGameStore";

export interface GameStateData {
  score: number;
  streak: number;
  mode: GameMode;
  pinDirection: PinDirection;
  pinLocation: [number, number] | null;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
  timeRemaining: number;
  difficultyStage: number;
  totalLevels: number;
  unlockedStage: number;
  totalQuestions: number;
  totalAttempts: number;
  correctAttempts: number;
  playedCountryCodes: string[];
  sessionPlayedCodes: string[];
  gameStatus: "idle" | "playing" | "finished";
  currentCountryCode: string | null;
  choices: string[];
  choiceCodes: string[];
  missionId: string | null;
  feedback: "correct" | "wrong" | null;
  clickedName: string | null;
  clickedCode: string | null;
  revealed: boolean;
  streakLost: number | null;
  startTime: number | null;
  maxStreak: number;
  baseChallengeValue: number;
}

export const createInitialGameState = (
  unlockedStage = 1,
): GameStateData => ({
  score: 0,
  streak: 0,
  mode: "identify",
  pinDirection: "locate",
  pinLocation: null,
  subMode: "name",
  challengeType: "world",
  challengeValue: 0,
  timeRemaining: 0,
  difficultyStage: 1,
  totalLevels: 0,
  unlockedStage,
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
  feedback: null,
  clickedName: null,
  clickedCode: null,
  revealed: false,
  streakLost: null,
  startTime: null,
  maxStreak: 0,
  baseChallengeValue: 0,
});
