import { describe, expect, it } from "vitest";
import type { CountryData } from "../../../data/country-data";
import {
  generateChoiceCountries,
  getAnswerTransition,
  getRoundActionTransition,
  getTargetPool,
  isChallengeComplete,
  isCorrectAnswer,
  isCountChallengeComplete,
  pickRandom,
  resolveMapCountry,
  shouldAdvanceRound,
} from "./gameRules";

const canada: CountryData = {
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
};

const france: CountryData = {
  ...canada,
  name: "France",
  officialName: "French Republic",
  cca2: "FR",
  cca3: "FRA",
  ccn3: "250",
  capital: ["Paris"],
  subregion: "Western Europe",
  flag: "🇫🇷",
};

describe("resolveMapCountry", () => {
  it("resolves by alpha-3 or numeric country code", () => {
    expect(resolveMapCountry("Unknown", "CAN", [canada])).toBe(canada);
    expect(resolveMapCountry("Unknown", "124", [canada])).toBe(canada);
  });

  it("falls back to normalized country names", () => {
    expect(resolveMapCountry("canada", "unknown", [canada])).toBe(canada);
    expect(resolveMapCountry("Unknown", "unknown", [canada])).toBeNull();
  });

  it("applies known map-name aliases before normalized matching", () => {
    const ivoryCoast = {
      ...canada,
      name: "Côte d'Ivoire",
      cca2: "CI",
      cca3: "CIV",
      ccn3: "384",
    };

    expect(resolveMapCountry("Ivory Coast", "unknown", [ivoryCoast])).toBe(
      ivoryCoast,
    );
  });

  it("resolves map countries using the built-in fallback catalog when the runtime countries list is empty", () => {
    expect(resolveMapCountry("France", "250", [])?.cca3).toBe("FRA");
    expect(resolveMapCountry("United States of America", "840", [])?.cca3).toBe(
      "USA",
    );
  });
});

describe("isCorrectAnswer", () => {
  it("checks map selections by resolved country", () => {
    expect(
      isCorrectAnswer({ type: "map", country: canada }, canada, "name"),
    ).toBe(true);
    expect(
      isCorrectAnswer({ type: "map", country: france }, canada, "name"),
    ).toBe(false);
    expect(
      isCorrectAnswer({ type: "map", country: null }, canada, "name"),
    ).toBe(false);
  });

  it("checks choice answers according to the active prompt", () => {
    expect(
      isCorrectAnswer({ type: "choice", value: "cA" }, canada, "flag"),
    ).toBe(true);
    expect(
      isCorrectAnswer({ type: "choice", value: "OTTAWA" }, canada, "capital"),
    ).toBe(true);
    expect(
      isCorrectAnswer({ type: "choice", value: "canada" }, canada, "name"),
    ).toBe(true);
    expect(
      isCorrectAnswer({ type: "choice", value: "Paris" }, canada, "capital"),
    ).toBe(false);
    expect(
      isCorrectAnswer(
        { type: "choice", value: "Ottawa" },
        { ...canada, capital: [] },
        "capital",
      ),
    ).toBe(false);
  });
});

describe("getAnswerTransition", () => {
  it("awards an increasing streak bonus for a correct answer", () => {
    expect(getAnswerTransition(true, { score: 30, streak: 2 })).toEqual({
      feedback: "correct",
      score: 60,
      streak: 3,
      streakLost: null,
      revealed: false,
    });
  });
});

describe("round lifecycle transitions", () => {
  const activeRound = { score: 30, streak: 2, revealed: false };

  it("applies answer feedback and keeps the existing response delays", () => {
    expect(
      getRoundActionTransition(
        { type: "answer", isCorrect: true },
        activeRound,
      ),
    ).toMatchObject({
      kind: "outcome",
      attemptIsCorrect: true,
      feedback: "correct",
      score: 60,
      streak: 3,
      revealed: false,
      advanceDelayMs: 1200,
    });

    expect(
      getRoundActionTransition(
        { type: "answer", isCorrect: false },
        activeRound,
      ),
    ).toMatchObject({
      kind: "outcome",
      attemptIsCorrect: false,
      feedback: "wrong",
      score: 30,
      streak: 0,
      streakLost: 2,
      revealed: true,
      advanceDelayMs: 2000,
    });
  });

  it("advances immediately after a correct answer to a revealed round", () => {
    expect(
      getRoundActionTransition(
        { type: "answer", isCorrect: true },
        { ...activeRound, revealed: true },
      ),
    ).toMatchObject({
      kind: "advance",
      attemptIsCorrect: null,
      advanceDelayMs: 0,
    });
  });

  it("ignores incorrect map answers after reveal without recording another attempt", () => {
    expect(
      getRoundActionTransition(
        {
          type: "answer",
          isCorrect: false,
          ignoreIncorrectWhenRevealed: true,
        },
        { ...activeRound, revealed: true },
      ),
    ).toMatchObject({
      kind: "ignore",
      attemptIsCorrect: null,
      advanceDelayMs: null,
    });
  });

  it("reveals with mode-specific streak behavior", () => {
    expect(
      getRoundActionTransition(
        { type: "reveal", loseStreak: true },
        activeRound,
      ),
    ).toMatchObject({
      kind: "outcome",
      attemptIsCorrect: false,
      feedback: null,
      streak: 0,
      streakLost: 2,
      revealed: true,
      advanceDelayMs: 2500,
    });
    expect(
      getRoundActionTransition(
        { type: "reveal", loseStreak: false },
        activeRound,
      ),
    ).toMatchObject({ streak: 2, streakLost: null });
  });

  it("skips by revealing the target and resetting an active streak", () => {
    expect(getRoundActionTransition({ type: "skip" }, activeRound)).toMatchObject({
      kind: "outcome",
      attemptIsCorrect: false,
      feedback: null,
      streak: 0,
      streakLost: 2,
      revealed: true,
      advanceDelayMs: 1500,
    });
  });

  it("finishes count and timer challenges at their boundaries", () => {
    expect(isCountChallengeComplete("count", 10, 9)).toBe(false);
    expect(isCountChallengeComplete("count", 10, 10)).toBe(true);
    expect(isChallengeComplete("timer", 30, 2, 0)).toBe(true);
    expect(isChallengeComplete("timer", 30, 2, 1)).toBe(false);
    expect(isChallengeComplete("world", 0, 100, 0)).toBe(false);
    expect(shouldAdvanceRound("count", 10, 9)).toBe(true);
    expect(shouldAdvanceRound("count", 10, 10)).toBe(false);
    expect(shouldAdvanceRound("timer", 30, 10)).toBe(true);
  });
});

describe("getTargetPool", () => {
  const countries = [canada, france, { ...canada, cca3: "MCO", name: "Monaco" }];

  it("limits world targets to unlocked countries not already played this session", () => {
    expect(
      getTargetPool({
        countries,
        challengeType: "world",
        challengeValue: 0,
        difficultyStage: 1,
        unlockedStage: 1,
        playedCountryCodes: [],
        sessionPlayedCodes: ["CAN"],
      }),
    ).toEqual([france]);
  });

  it("progresses stage by stage in world mode before advancing to harder unlocked stages", () => {
    const sweden: CountryData = { ...canada, cca3: "SWE", name: "Sweden" }; // Stage 2
    const poolWithStage1Remaining = getTargetPool({
      countries: [canada, sweden],
      challengeType: "world",
      challengeValue: 0,
      difficultyStage: 1,
      unlockedStage: 3,
      playedCountryCodes: [],
      sessionPlayedCodes: [],
    });
    expect(poolWithStage1Remaining).toEqual([canada]);

    const poolAfterStage1Exhausted = getTargetPool({
      countries: [canada, sweden],
      challengeType: "world",
      challengeValue: 0,
      difficultyStage: 1,
      unlockedStage: 3,
      playedCountryCodes: [],
      sessionPlayedCodes: ["CAN"],
    });
    expect(poolAfterStage1Exhausted).toEqual([sweden]);
  });

  it("uses the selected tier and excludes countries played in the mission", () => {
    expect(
      getTargetPool({
        countries,
        challengeType: "count",
        challengeValue: 10,
        difficultyStage: 1,
        unlockedStage: 1,
        playedCountryCodes: ["CAN"],
        sessionPlayedCodes: [],
      }),
    ).toEqual([france]);
  });

  it("returns no candidates for an empty tier", () => {
    expect(
      getTargetPool({
        countries,
        challengeType: "count",
        challengeValue: 10,
        difficultyStage: 2,
        unlockedStage: 1,
        playedCountryCodes: [],
        sessionPlayedCodes: [],
      }),
    ).toEqual([]);
  });
});

describe("choice and target selection", () => {
  it("selects the target plus unique regional distractors deterministically", () => {
    const mexico: CountryData = {
      ...canada,
      name: "Mexico",
      cca2: "MX",
      cca3: "MEX",
      ccn3: "484",
      subregion: "North America",
    };
    const us: CountryData = {
      ...canada,
      name: "United States",
      cca2: "US",
      cca3: "USA",
      ccn3: "840",
      subregion: "North America",
    };

    expect(
      generateChoiceCountries(canada, [canada, france, mexico, us], () => 0),
    ).toEqual([canada, us, mexico, france]);
  });

  it("supports deterministic target selection and empty pools", () => {
    expect(pickRandom([canada, france], () => 0)).toBe(canada);
    expect(pickRandom([canada, france], () => 0.99)).toBe(france);
    expect(pickRandom([], () => 0)).toBeUndefined();
  });
});

describe("getAnswerTransition wrong outcomes", () => {
  it("preserves score and reports a lost streak after a wrong answer", () => {
    expect(getAnswerTransition(false, { score: 30, streak: 2 })).toEqual({
      feedback: "wrong",
      score: 30,
      streak: 0,
      streakLost: 2,
      revealed: true,
    });
  });

  it("does not report a lost streak when there was no active streak", () => {
    expect(getAnswerTransition(false, { score: 30, streak: 0 })).toEqual({
      feedback: "wrong",
      score: 30,
      streak: 0,
      streakLost: null,
      revealed: true,
    });
  });
});
