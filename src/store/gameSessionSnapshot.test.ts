import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./gameStateDefaults";
import {
  createGameSessionSnapshot,
  InvalidGameSessionSnapshotError,
  restoreGameSessionSnapshot,
} from "./gameSessionSnapshot";
import { useGameStore } from "./useGameStore";

describe("game session snapshots", () => {
  it("round-trips gameplay state while excluding transient feedback and local unlock progress", () => {
    const state = {
      ...createInitialGameState(4),
      score: 120,
      streak: 3,
      maxStreak: 5,
      mode: "pin" as const,
      pinDirection: "locate" as const,
      pinLocation: [-73.5, 45.5] as [number, number],
      challengeType: "timer" as const,
      challengeValue: 60,
      timeRemaining: 42,
      totalQuestions: 8,
      totalAttempts: 6,
      correctAttempts: 4,
      playedCountryCodes: ["CAN", "USA"],
      sessionPlayedCodes: ["CAN", "USA", "FRA"],
      gameStatus: "playing" as const,
      currentCountryCode: "FRA",
      choices: ["France", "Canada"],
      choiceCodes: ["FRA", "CAN"],
      missionId: "mission-8",
      feedback: "wrong" as const,
      clickedName: "Canada",
      clickedCode: "CAN",
      revealed: true,
      streakLost: 3,
    };

    const snapshot = createGameSessionSnapshot(state);
    const restored = restoreGameSessionSnapshot(
      JSON.parse(JSON.stringify(snapshot)),
      7,
    );

    expect(restored).toMatchObject({
      score: 120,
      streak: 3,
      maxStreak: 5,
      mode: "pin",
      pinDirection: "locate",
      pinLocation: [-73.5, 45.5],
      challengeType: "timer",
      timeRemaining: 42,
      totalQuestions: 8,
      totalAttempts: 6,
      correctAttempts: 4,
      playedCountryCodes: ["CAN", "USA"],
      sessionPlayedCodes: ["CAN", "USA", "FRA"],
      gameStatus: "playing",
      currentCountryCode: "FRA",
      choices: ["France", "Canada"],
      choiceCodes: ["FRA", "CAN"],
      missionId: "mission-8",
      revealed: true,
      unlockedStage: 7,
      feedback: null,
      clickedName: null,
      clickedCode: null,
      streakLost: null,
    });
    expect(snapshot).not.toHaveProperty("feedback");
    expect(snapshot).not.toHaveProperty("clickedCode");
    expect(snapshot).not.toHaveProperty("streakLost");
    expect(snapshot).not.toHaveProperty("unlockedStage");
  });

  it("rejects unsupported, malformed, and invalid local progression values", () => {
    const snapshot = createGameSessionSnapshot(createInitialGameState());

    expect(() =>
      restoreGameSessionSnapshot({ ...snapshot, version: 2 }, 1),
    ).toThrow(InvalidGameSessionSnapshotError);
    expect(() =>
      restoreGameSessionSnapshot({ ...snapshot, totalAttempts: -1 }, 1),
    ).toThrow(InvalidGameSessionSnapshotError);
    expect(() =>
      restoreGameSessionSnapshot({ ...snapshot, pinLocation: [181, 0] }, 1),
    ).toThrow(InvalidGameSessionSnapshotError);
    expect(() => restoreGameSessionSnapshot(snapshot, 0)).toThrow(
      InvalidGameSessionSnapshotError,
    );
  });

  it("exposes snapshot export and restore through the game store", () => {
    const store = useGameStore.getState();
    store.resetGame();
    useGameStore.getState().setScore(50);
    useGameStore.getState().setGameStatus("playing");

    const snapshot = useGameStore.getState().createSessionSnapshot();
    useGameStore.getState().setScore(0);
    useGameStore.getState().restoreSessionSnapshot(snapshot);

    expect(useGameStore.getState().score).toBe(50);
    expect(useGameStore.getState().gameStatus).toBe("playing");
    useGameStore.getState().resetGame();
  });
});
