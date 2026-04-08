import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GameMode = "identify" | "reverse";
export type SubMode = "name" | "flag" | "capital";
export type ChallengeType = "world" | "count" | "timer";

interface GameState {
  score: number;
  streak: number;
  mode: GameMode;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number; // For count or timer (seconds)
  timeRemaining: number;
  difficultyStage: number; // Current session stage
  totalLevels: number; // Total levels in the current mission series
  unlockedStage: number; // Highest unlocked stage (persisted)
  totalQuestions: number;
  totalAttempts: number; // Answers submitted
  correctAttempts: number; // Correct answers submitted
  playedCountryCodes: string[];
  sessionPlayedCodes: string[];
  gameStatus: "idle" | "playing" | "finished";
  currentCountryCode: string | null;
  choices: string[];
  missionId: string | null;
  feedback: "correct" | "wrong" | null;
  clickedName: string | null;
  clickedCode: string | null;
  revealed: boolean;
  pulseKey: number;
  streakLost: number | null;
  startTime: number | null;
  tempHighlightCode: string | null;

  // Actions
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setMode: (mode: GameMode) => void;
  setSubMode: (subMode: SubMode) => void;
  setChallenge: (type: ChallengeType, value: number) => void;
  setTimeRemaining: (time: number) => void;
  setDifficultyStage: (stage: number) => void;
  setTotalLevels: (total: number) => void;
  recordPlayedCountry: (code: string) => void;
  recordSessionCode: (code: string) => void;
  recordAttempt: (isCorrect: boolean) => void;
  unlockNextStage: () => void;
  startNewMission: () => void;
  setGameStatus: (status: "idle" | "playing" | "finished") => void;
  setCurrentCountry: (code: string | null) => void;
  setChoices: (choices: string[]) => void;
  setMissionId: (id: string | null) => void;
  setFeedback: (
    feedback: "correct" | "wrong" | null,
    clickedName?: string | null,
    clickedCode?: string | null,
  ) => void;
  skipQuestion: (next: () => void) => void;
  setRevealed: (revealed: boolean) => void;
  triggerPulse: () => void;
  resetGame: () => void;
  setStreakLost: (value: number | null) => void;
  setTempHighlightCode: (code: string | null) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      score: 0,
      streak: 0,
      mode: "identify",
      subMode: "name",
      challengeType: "world",
      challengeValue: 0,
      timeRemaining: 0,
      difficultyStage: 1,
      totalLevels: 0,
      unlockedStage: 1,
      totalQuestions: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      playedCountryCodes: [],
      sessionPlayedCodes: [],
      gameStatus: "idle",
      currentCountryCode: null,
      choices: [],
      missionId: null,
      feedback: null,
      clickedName: null,
      clickedCode: null,
      revealed: false,
      pulseKey: 0,
      streakLost: null,
      startTime: null,
      tempHighlightCode: null,

      setScore: (score) => set({ score }),
      setStreak: (streak) => set({ streak }),
      setMode: (mode) => set({ mode }),
      setSubMode: (subMode) => set({ subMode }),
      setChallenge: (challengeType, challengeValue) =>
        set({
          challengeType,
          challengeValue,
          timeRemaining: challengeType === "timer" ? challengeValue : 0,
        }),
      setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
      setDifficultyStage: (difficultyStage) => set({ difficultyStage }),
      setTotalLevels: (totalLevels) => set({ totalLevels }),
      recordPlayedCountry: (code) =>
        set((state) => ({
          playedCountryCodes: [...state.playedCountryCodes, code],
          sessionPlayedCodes: Array.from(
            new Set([...state.sessionPlayedCodes, code]),
          ),
          totalQuestions: state.totalQuestions + 1,
        })),
      recordSessionCode: (code) =>
        set((state) => ({
          sessionPlayedCodes: Array.from(
            new Set([...state.sessionPlayedCodes, code]),
          ),
        })),
      recordAttempt: (isCorrect) =>
        set((state) => ({
          totalAttempts: state.totalAttempts + 1,
          correctAttempts: isCorrect
            ? state.correctAttempts + 1
            : state.correctAttempts,
        })),
      unlockNextStage: () =>
        set((state) => {
          if (state.difficultyStage === state.unlockedStage) {
            return { unlockedStage: Math.min(state.unlockedStage + 1, 225) };
          }
          return {};
        }),
      startNewMission: () =>
        set((state) => ({
          score: 0,
          streak: 0,
          totalQuestions: 0,
          totalAttempts: 0,
          correctAttempts: 0,
          playedCountryCodes: [],
          gameStatus: "playing",
          timeRemaining:
            state.challengeType === "timer" ? state.challengeValue : 0,
          streakLost: null,
          startTime: Date.now(),
        })),
      setGameStatus: (status) => set({ gameStatus: status }),
      setCurrentCountry: (code) => set({ currentCountryCode: code }),
      setChoices: (choices) => set({ choices }),
      setMissionId: (id) => set({ missionId: id }),
      setFeedback: (feedback, clickedName = null, clickedCode = null) =>
        set({ feedback, clickedName, clickedCode }),
      skipQuestion: (next) => {
        set({
          streak: 0,
          revealed: false,
          feedback: null,
          clickedName: null,
          clickedCode: null,
        });
        next();
      },
      setRevealed: (revealed) => set({ revealed }),
      triggerPulse: () => set((state) => ({ pulseKey: state.pulseKey + 1 })),
      resetGame: () =>
        set({
          score: 0,
          streak: 0,
          mode: "identify",
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
          missionId: null,
          feedback: null,
          clickedName: null,
          clickedCode: null,
          revealed: false,
          pulseKey: 0,
          streakLost: null,
          startTime: null,
        }),
      setStreakLost: (streakLost) => set({ streakLost }),
      setTempHighlightCode: (tempHighlightCode) => set({ tempHighlightCode }),
    }),
    {
      name: "geobble-storage",
      partialize: (state) => ({ unlockedStage: state.unlockedStage }), // Only persist the unlock progress
    },
  ),
);
