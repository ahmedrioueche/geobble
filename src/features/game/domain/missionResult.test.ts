import { describe, expect, it } from "vitest";
import { buildMissionResult } from "./missionResult";

const baseInput = {
  score: 120,
  maxStreak: 4,
  totalAttempts: 10,
  correctAttempts: 8,
  challengeType: "count" as const,
  challengeValue: 10,
  difficultyStage: 1,
  totalQuestions: 10,
  countriesCount: 195,
  startTime: 1000,
  totalLevels: 1,
  now: 5000,
};

describe("buildMissionResult", () => {
  it("uses accuracy and returns the established mission summary fields", () => {
    expect(buildMissionResult(baseInput)).toEqual({
      score: 120,
      accuracy: 0.8,
      streak: 4,
      correctAnswers: 8,
      totalQuestions: 10,
      isVictory: true,
      difficultyStage: 1,
      challengeType: "count",
      challengeValue: 10,
      isWorldCompletion: true,
      timeElapsed: 4000,
      totalLevels: 1,
    });
  });

  it("requires ten correct answers for timer victory regardless of accuracy", () => {
    expect(
      buildMissionResult({
        ...baseInput,
        challengeType: "timer",
        challengeValue: 60,
        totalAttempts: 10,
        correctAttempts: 9,
      }).isVictory,
    ).toBe(false);
    expect(
      buildMissionResult({
        ...baseInput,
        challengeType: "timer",
        challengeValue: 60,
        totalAttempts: 20,
        correctAttempts: 10,
      }).isVictory,
    ).toBe(true);
  });

  it("uses country count for world results and marks world completion only after all countries", () => {
    const result = buildMissionResult({
      ...baseInput,
      challengeType: "world",
      totalQuestions: 194,
      countriesCount: 195,
    });

    expect(result.totalQuestions).toBe(195);
    expect(result.isWorldCompletion).toBe(false);
  });

  it("returns zero elapsed time when the mission has no start time", () => {
    expect(
      buildMissionResult({ ...baseInput, startTime: null }).timeElapsed,
    ).toBe(0);
  });
});
