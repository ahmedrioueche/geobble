import { describe, expect, it } from "vitest";
import { getMissionStartSettings } from "./missionProgression";

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
});
