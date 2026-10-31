import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createInitialGameState,
  type GameStateData,
} from "./gameStateDefaults";
import {
  createGameSessionSnapshot,
  restoreGameSessionSnapshot,
} from "./gameSessionSnapshot";
import type { GameSessionSnapshot } from "./gameSessionSnapshot";
import { createRandomSeed, getNextSeededRandom } from "./seededRandom";
import { createSafeBrowserStorage } from "./safeBrowserStorage";

export type GameMode = "identify" | "reverse" | "pin";
export type PinDirection = "locate" | "identify";
export type SubMode = "name" | "flag" | "capital";
export type ChallengeType = "world" | "count" | "timer";

interface GameState extends GameStateData {
  // Actions
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setMode: (mode: GameMode) => void;
  setPinDirection: (direction: PinDirection) => void;
  setPinLocation: (location: [number, number] | null) => void;
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
  setChoiceCodes: (codes: string[]) => void;
  setMissionId: (id: string | null) => void;
  setFeedback: (
    feedback: "correct" | "wrong" | null,
    clickedName?: string | null,
    clickedCode?: string | null,
  ) => void;
  skipQuestion: (next: () => void) => void;
  setRevealed: (revealed: boolean) => void;
  setPendingAdvanceAt: (timestamp: number | null) => void;
  resetGame: () => void;
  setStreakLost: (value: number | null) => void;
  nextRandom: () => number;
  createSessionSnapshot: () => GameSessionSnapshot;
  restoreSessionSnapshot: (snapshot: unknown) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialGameState(),
      setScore: (score) => set({ score }),
      setStreak: (streak) =>
        set((state) => ({
          streak,
          maxStreak: Math.max(state.maxStreak || 0, streak),
        })),
      nextRandom: () => {
        let value = 0;
        set((state) => {
          const next = getNextSeededRandom(state.randomState);
          value = next.value;
          return { randomState: next.state };
        });
        return value;
      },
      setMode: (mode) => set({ mode }),
      setPinDirection: (pinDirection) => set({ pinDirection }),
      setPinLocation: (pinLocation) => set({ pinLocation }),
      setSubMode: (subMode) => set({ subMode }),
      setChallenge: (challengeType, challengeValue) =>
        set({
          challengeType,
          challengeValue,
          baseChallengeValue: challengeValue, // Store the primary selection
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
          randomState: createRandomSeed(),
          pendingAdvanceAt: null,
          maxStreak: 0,
          totalQuestions: 0,
          totalAttempts: 0,
          correctAttempts: 0,
          playedCountryCodes: [],
          gameStatus: "playing",
          pinLocation: null,
          timeRemaining:
            state.challengeType === "timer" ? state.challengeValue : 0,
          streakLost: null,
          startTime: Date.now(),
        })),
      setGameStatus: (status) =>
        set({
          gameStatus: status,
          ...(status === "playing" ? {} : { pendingAdvanceAt: null }),
        }),
      setCurrentCountry: (code) => set({ currentCountryCode: code }),
      setChoices: (choices) => set({ choices }),
      setChoiceCodes: (choiceCodes) => set({ choiceCodes }),
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
      setPendingAdvanceAt: (pendingAdvanceAt) => set({ pendingAdvanceAt }),
      resetGame: () =>
        set((state) => createInitialGameState(state.unlockedStage)),
      setStreakLost: (streakLost) => set({ streakLost }),
      createSessionSnapshot: () => createGameSessionSnapshot(get()),
      restoreSessionSnapshot: (snapshot) =>
        set(
          restoreGameSessionSnapshot(
            snapshot,
            get().unlockedStage,
          ),
        ),
    }),
    {
      name: "geobble-storage",
      storage: createJSONStorage(createSafeBrowserStorage),
      partialize: (state) => ({ unlockedStage: state.unlockedStage }), // Only persist the unlock progress
    },
  ),
);
