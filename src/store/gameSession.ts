export type GameMode = "identify" | "reverse" | "pin";
export type PinDirection = "locate" | "identify";
export type SubMode = "name" | "flag" | "capital";
export type ChallengeType = "world" | "count" | "timer";

export interface GameSessionState {
  id: string | null;
  lastCommandId: number;
  timerDeadlineAt: number | null;
  score: number;
  streak: number;
  randomState: number;
  mode: GameMode;
  pinDirection: PinDirection;
  pinLocation: [number, number] | null;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
  timeRemaining: number;
  difficultyStage: number;
  totalLevels: number;
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
  revealed: boolean;
  pendingAdvanceAt: number | null;
  startTime: number | null;
  maxStreak: number;
  baseChallengeValue: number;
}

export type GameFeedback = "correct" | "wrong" | null;

export interface GameUiState {
  feedback: GameFeedback;
  clickedName: string | null;
  clickedCode: string | null;
  streakLost: number | null;
}

let fallbackSessionIdCounter = 0;

export const createGameSessionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  fallbackSessionIdCounter += 1;
  return `${Date.now().toString(36)}-${fallbackSessionIdCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};
