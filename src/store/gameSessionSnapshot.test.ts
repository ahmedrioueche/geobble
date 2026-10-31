import { describe, expect, it } from "vitest";
import type { CountryData } from "../data/country-data";
import { generateChoiceCountries, pickRandom } from "../features/game/gameRules";
import { createInitialGameState } from "./gameStateDefaults";
import {
  createGameSessionSnapshot,
  InvalidGameSessionSnapshotError,
  restoreGameSessionSnapshot,
} from "./gameSessionSnapshot";
import { useGameStore } from "./useGameStore";
import { getNextSeededRandom } from "./seededRandom";

const countries: CountryData[] = [
  {
    name: "Canada",
    officialName: "Canada",
    cca2: "CA",
    cca3: "CAN",
    ccn3: "124",
    capital: ["Ottawa"],
    region: "Americas",
    subregion: "North America",
    flag: "🇨🇦",
    population: 40000000,
  },
  {
    name: "United States",
    officialName: "United States of America",
    cca2: "US",
    cca3: "USA",
    ccn3: "840",
    capital: ["Washington, D.C."],
    region: "Americas",
    subregion: "North America",
    flag: "🇺🇸",
    population: 330000000,
  },
  {
    name: "France",
    officialName: "French Republic",
    cca2: "FR",
    cca3: "FRA",
    ccn3: "250",
    capital: ["Paris"],
    region: "Europe",
    subregion: "Western Europe",
    flag: "🇫🇷",
    population: 68000000,
  },
  {
    name: "Brazil",
    officialName: "Federative Republic of Brazil",
    cca2: "BR",
    cca3: "BRA",
    ccn3: "076",
    capital: ["Brasília"],
    region: "Americas",
    subregion: "South America",
    flag: "🇧🇷",
    population: 215000000,
  },
];

describe("game session snapshots", () => {
  it("round-trips gameplay state while excluding transient feedback and local unlock progress", () => {
    const state = {
      ...createInitialGameState(4),
      score: 120,
      streak: 3,
      randomState: 987654321,
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
      randomState: 987654321,
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

  it("continues with the same target and distractors after restoring a snapshot", () => {
    const snapshot = createGameSessionSnapshot({
      ...createInitialGameState(),
      randomState: 123456789,
      gameStatus: "playing",
    });

    const continueSession = (initialState: number) => {
      let state = initialState;
      const random = () => {
        const next = getNextSeededRandom(state);
        state = next.state;
        return next.value;
      };
      const target = pickRandom(countries, random);
      if (!target) throw new Error("Expected a target country");

      return {
        target,
        choices: generateChoiceCountries(target, countries, random),
        randomState: state,
      };
    };

    const uninterrupted = continueSession(snapshot.randomState);
    const restored = restoreGameSessionSnapshot(
      JSON.parse(JSON.stringify(snapshot)),
      1,
    );
    const resumed = continueSession(restored.randomState);

    expect(resumed).toEqual(uninterrupted);
  });

  it("counts offline time against a resumed timer challenge", () => {
    const snapshot = createGameSessionSnapshot(
      {
        ...createInitialGameState(),
        challengeType: "timer",
        challengeValue: 30,
        timeRemaining: 5,
        gameStatus: "playing",
      },
      1000,
    );

    expect(restoreGameSessionSnapshot(snapshot, 1, 4500).timeRemaining).toBe(2);
    expect(restoreGameSessionSnapshot(snapshot, 1, 7000).timeRemaining).toBe(0);
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
      restoreGameSessionSnapshot({ ...snapshot, randomState: 0x100000000 }, 1),
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
    const expectedNextRandom = useGameStore.getState().nextRandom();
    useGameStore.getState().setScore(0);
    useGameStore.getState().restoreSessionSnapshot(snapshot);

    expect(useGameStore.getState().score).toBe(50);
    expect(useGameStore.getState().gameStatus).toBe("playing");
    expect(useGameStore.getState().nextRandom()).toBe(expectedNextRandom);
    useGameStore.getState().resetGame();
  });
});
