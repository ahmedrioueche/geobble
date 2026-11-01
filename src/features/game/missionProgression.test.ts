// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { CountryData } from "../../data/country-data";
import { createInitialGameSession } from "../../store/gameStateDefaults";
import { getMissionStartSettings } from "./missionProgression";
import { advanceMission, finishMission, startMission } from "./gameEngine";

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

  it("starts and advances a mission deterministically from the session seed", () => {
    const session = {
      ...createInitialGameSession(),
      id: "session-1",
      randomState: 123,
      gameStatus: "playing" as const,
      difficultyStage: 5,
    };

    const first = advanceMission(session, countries, 5);
    const repeated = advanceMission(session, countries, 5);
    expect(first).toEqual(repeated);
    expect(first.type).toBe("advanced");
    if (first.type !== "advanced") return;
    expect(first.session).toMatchObject({
      totalQuestions: 1,
      missionId: "session-1:1",
      playedCountryCodes: [first.target.cca3],
      sessionPlayedCodes: [first.target.cca3],
    });
    expect(first.session.randomState).not.toBe(session.randomState);

    const next = advanceMission(first.session, countries, 5);
    expect(next.type).toBe("advanced");
    if (next.type !== "advanced") return;
    expect(next.target.cca3).not.toBe(first.target.cca3);
    expect(next.session.totalQuestions).toBe(2);
  });

  it("creates sorted choice options as part of the same seeded transition", () => {
    const session = {
      ...createInitialGameSession(),
      id: "session-1",
      randomState: 123,
      gameStatus: "playing" as const,
      difficultyStage: 5,
      mode: "reverse" as const,
    };

    const transition = advanceMission(session, countries, 5);
    expect(transition.type).toBe("advanced");
    if (transition.type !== "advanced") return;
    expect(transition.session.choiceCodes).toHaveLength(2);
    expect(transition.session.choices).toEqual(
      [...transition.session.choices].sort((a, b) => a.localeCompare(b)),
    );
    expect(transition.session.choiceCodes).toContain(transition.target.cca3);
  });

  it("reports completed and exhausted missions without mutating their sessions", () => {
    const worldSession = {
      ...createInitialGameSession(),
      gameStatus: "playing" as const,
      challengeType: "world" as const,
      totalQuestions: countries.length,
      difficultyStage: 5,
    };
    const complete = advanceMission(worldSession, countries, 5);
    expect(complete).toEqual({
      type: "finished",
      reason: "world-complete",
      session: worldSession,
    });

    const exhaustedSession = {
      ...worldSession,
      totalQuestions: 0,
      sessionPlayedCodes: countries.map((country) => country.cca3),
    };
    const exhausted = advanceMission(exhaustedSession, countries, 1);
    expect(exhausted).toEqual({
      type: "finished",
      reason: "target-exhausted",
      session: exhaustedSession,
    });
  });

  it("does not advance an inactive or completed count challenge", () => {
    const session = {
      ...createInitialGameSession(),
      currentCountryCode: "CAN",
      gameStatus: "playing" as const,
      challengeType: "count" as const,
      challengeValue: 3,
      totalAttempts: 3,
    };

    expect(advanceMission(session, countries, 5)).toEqual({
      type: "ignored",
      session,
    });
    expect(
      advanceMission(
        { ...session, gameStatus: "finished" },
        countries,
        5,
      ).type,
    ).toBe("ignored");
  });

  it("starts and finishes through pure session transitions", () => {
    const session = {
      ...createInitialGameSession(),
      id: "session-1",
      randomState: 123,
      challengeType: "world" as const,
      challengeValue: 0,
      gameStatus: "playing" as const,
      difficultyStage: 5,
    };
    const started = startMission(session, countries, 5);
    expect(started.type).toBe("advanced");
    expect(started.session.totalLevels).toBeGreaterThan(0);

    const finished = finishMission(
      {
        ...session,
        score: 50,
        totalAttempts: 5,
        correctAttempts: 4,
        maxStreak: 3,
        pendingAdvanceAt: 1234,
        timerDeadlineAt: 5678,
      },
      countries.length,
      9000,
    );
    expect(finished.session).toMatchObject({
      gameStatus: "finished",
      pendingAdvanceAt: null,
      timerDeadlineAt: null,
    });
    expect(finished.result).toMatchObject({
      score: 50,
      accuracy: 0.8,
      isVictory: true,
    });
  });
});
