// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CountryData } from "../../data/country-data";
import { useGameStore } from "../../store/useGameStore";
import { getMissionStartSettings } from "./missionProgression";
import { useMissionProgression } from "./hooks/useMissionProgression";

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
];

describe("getMissionStartSettings", () => {
  it("uses the base count as the tier anchor and clamps the stage", () => {
    const highestStage = getMissionStartSettings({
      challengeType: "count",
      baseChallengeValue: 20,
      challengeValue: 10,
      difficultyStage: 999,
    });

    expect(highestStage.totalLevels).toBeGreaterThan(1);
    expect(highestStage.challengeValue).toBeGreaterThan(0);

    const firstStage = getMissionStartSettings({
      challengeType: "count",
      baseChallengeValue: 20,
      challengeValue: 10,
      difficultyStage: 1,
    });
    expect(firstStage.challengeValue).toBe(20);
  });

  it("keeps timer duration while deriving levels from the default tier size", () => {
    expect(
      getMissionStartSettings({
        challengeType: "timer",
        baseChallengeValue: 60,
        challengeValue: 60,
        difficultyStage: 1,
      }),
    ).toEqual({ totalLevels: 7, challengeValue: 60 });
  });

  it("uses the current value when no base count was saved", () => {
    const settings = getMissionStartSettings({
      challengeType: "count",
      baseChallengeValue: 0,
      challengeValue: 20,
      difficultyStage: 1,
    });

    expect(settings.challengeValue).toBe(20);
  });

  it("uses an injected random source to choose reproducible mission targets", () => {
    const store = useGameStore.getState();
    store.resetGame();
    useGameStore.getState().setChallenge("world", 0);
    useGameStore.getState().setGameStatus("playing");

    const mounted = renderHook(() =>
      useMissionProgression({
        countries,
        random: () => 0.99,
        generateChoices: () => {},
        finishGame: () => {},
      }),
    );

    act(() => mounted.result.current.nextQuestion());
    expect(useGameStore.getState().currentCountryCode).toBe("USA");

    act(() => mounted.result.current.nextQuestion());
    expect(useGameStore.getState().currentCountryCode).toBe("CAN");
    mounted.unmount();
    useGameStore.getState().resetGame();
  });
});
