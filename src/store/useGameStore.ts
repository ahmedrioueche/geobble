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
import {
  createGameSessionId,
  type ChallengeType,
  type GameMode,
  type GameSessionState,
  type PinDirection,
  type SubMode,
} from "./gameSession";
import { createRandomSeed, getNextSeededRandom } from "./seededRandom";
import { systemGameClock } from "./gameClock";
import { createSafeBrowserStorage } from "./safeBrowserStorage";
import { useGameUiStore } from "./useGameUiStore";

export type {
  ChallengeType,
  GameMode,
  PinDirection,
  SubMode,
} from "./gameSession";

interface GameState extends GameStateData {
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
  startNewMission: (options?: { seed?: number; now?: number }) => void;
  setGameStatus: (status: "idle" | "playing" | "finished") => void;
  setCurrentCountry: (code: string | null) => void;
  setChoices: (choices: string[]) => void;
  setChoiceCodes: (codes: string[]) => void;
  setMissionId: (id: string | null) => void;
  skipQuestion: (next: () => void) => void;
  setRevealed: (revealed: boolean) => void;
  setPendingAdvanceAt: (timestamp: number | null) => void;
  resetGame: () => void;
  nextRandom: () => number;
  createSessionSnapshot: () => GameSessionSnapshot;
  restoreSessionSnapshot: (snapshot: unknown) => void;
}

const updateSession = (
  session: GameSessionState,
  changes: Partial<GameSessionState>,
): GameSessionState => ({ ...session, ...changes });

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialGameState(),
      setScore: (score) =>
        set((state) => ({
          session: updateSession(state.session, { score }),
        })),
      setStreak: (streak) =>
        set((state) => ({
          session: updateSession(state.session, {
            streak,
            maxStreak: Math.max(state.session.maxStreak, streak),
          }),
        })),
      nextRandom: () => {
        let value = 0;
        set((state) => {
          const next = getNextSeededRandom(state.session.randomState);
          value = next.value;
          return {
            session: updateSession(state.session, { randomState: next.state }),
          };
        });
        return value;
      },
      setMode: (mode) =>
        set((state) => ({
          session: updateSession(state.session, { mode }),
        })),
      setPinDirection: (pinDirection) =>
        set((state) => ({
          session: updateSession(state.session, { pinDirection }),
        })),
      setPinLocation: (pinLocation) =>
        set((state) => ({
          session: updateSession(state.session, { pinLocation }),
        })),
      setSubMode: (subMode) =>
        set((state) => ({
          session: updateSession(state.session, { subMode }),
        })),
      setChallenge: (challengeType, challengeValue) =>
        set((state) => ({
          session: updateSession(state.session, {
            challengeType,
            challengeValue,
            baseChallengeValue: challengeValue,
            timeRemaining: challengeType === "timer" ? challengeValue : 0,
            timerDeadlineAt: null,
          }),
        })),
      setTimeRemaining: (timeRemaining) =>
        set((state) => ({
          session: updateSession(state.session, { timeRemaining }),
        })),
      setDifficultyStage: (difficultyStage) =>
        set((state) => ({
          session: updateSession(state.session, { difficultyStage }),
        })),
      setTotalLevels: (totalLevels) =>
        set((state) => ({
          session: updateSession(state.session, { totalLevels }),
        })),
      recordPlayedCountry: (code) =>
        set((state) => ({
          session: updateSession(state.session, {
            playedCountryCodes: [...state.session.playedCountryCodes, code],
            sessionPlayedCodes: Array.from(
              new Set([...state.session.sessionPlayedCodes, code]),
            ),
            totalQuestions: state.session.totalQuestions + 1,
          }),
        })),
      recordSessionCode: (code) =>
        set((state) => ({
          session: updateSession(state.session, {
            sessionPlayedCodes: Array.from(
              new Set([...state.session.sessionPlayedCodes, code]),
            ),
          }),
        })),
      recordAttempt: (isCorrect) =>
        set((state) => ({
          session: updateSession(state.session, {
            totalAttempts: state.session.totalAttempts + 1,
            correctAttempts: isCorrect
              ? state.session.correctAttempts + 1
              : state.session.correctAttempts,
          }),
        })),
      unlockNextStage: () =>
        set((state) => {
          if (state.session.difficultyStage === state.unlockedStage) {
            return { unlockedStage: Math.min(state.unlockedStage + 1, 225) };
          }
          return {};
        }),
      startNewMission: (options) => {
        const now = options?.now ?? systemGameClock();
        const seed = options?.seed ?? createRandomSeed();
        if (!Number.isFinite(now) || now < 0) {
          throw new RangeError("Game session start time must be nonnegative");
        }
        if (
          !Number.isSafeInteger(seed) ||
          seed < 0 ||
          seed > 0xffffffff
        ) {
          throw new RangeError("Game session seed must be an unsigned 32-bit integer");
        }
        set((state) => ({
          session: updateSession(state.session, {
            id: createGameSessionId(),
            lastCommandId: 0,
            timerDeadlineAt:
              state.session.challengeType === "timer"
                ? now + state.session.challengeValue * 1000
                : null,
            score: 0,
            streak: 0,
            randomState: seed,
            pendingAdvanceAt: null,
            maxStreak: 0,
            totalQuestions: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            playedCountryCodes: [],
            gameStatus: "playing",
            pinLocation: null,
            timeRemaining:
              state.session.challengeType === "timer"
                ? state.session.challengeValue
                : 0,
            startTime: now,
          }),
        }));
        useGameUiStore.getState().resetGameUi();
      },
      setGameStatus: (gameStatus) =>
        set((state) => ({
          session: updateSession(state.session, {
            gameStatus,
            id:
              gameStatus === "playing"
                ? (state.session.id ?? createGameSessionId())
                : state.session.id,
            timerDeadlineAt:
              gameStatus !== "playing"
                ? null
                : (state.session.timerDeadlineAt ??
                  (state.session.challengeType === "timer"
                    ? systemGameClock() +
                      state.session.timeRemaining * 1000
                    : null)),
            ...(gameStatus === "playing" ? {} : { pendingAdvanceAt: null }),
          }),
        })),
      setCurrentCountry: (currentCountryCode) =>
        set((state) => ({
          session: updateSession(state.session, { currentCountryCode }),
        })),
      setChoices: (choices) =>
        set((state) => ({
          session: updateSession(state.session, { choices }),
        })),
      setChoiceCodes: (choiceCodes) =>
        set((state) => ({
          session: updateSession(state.session, { choiceCodes }),
        })),
      setMissionId: (missionId) =>
        set((state) => ({
          session: updateSession(state.session, { missionId }),
        })),
      skipQuestion: (next) => {
        set((state) => ({
          session: updateSession(state.session, {
            streak: 0,
            revealed: false,
          }),
        }));
        useGameUiStore.getState().setFeedback(null);
        next();
      },
      setRevealed: (revealed) =>
        set((state) => ({
          session: updateSession(state.session, { revealed }),
        })),
      setPendingAdvanceAt: (pendingAdvanceAt) =>
        set((state) => ({
          session: updateSession(state.session, { pendingAdvanceAt }),
        })),
      resetGame: () => {
        set((state) => createInitialGameState(state.unlockedStage));
        useGameUiStore.getState().resetGameUi();
      },
      createSessionSnapshot: () => createGameSessionSnapshot(get().session),
      restoreSessionSnapshot: (snapshot) => {
        const restored = restoreGameSessionSnapshot(
          snapshot,
          get().unlockedStage,
        );
        set(restored);
        useGameUiStore.getState().resetGameUi();
      },
    }),
    {
      name: "geobble-storage",
      storage: createJSONStorage(createSafeBrowserStorage),
      partialize: (state) => ({ unlockedStage: state.unlockedStage }),
    },
  ),
);
