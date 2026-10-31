import { getTierRanges } from "../../data/difficulty-ranking";
import type { ChallengeType } from "../../store/useGameStore";

interface MissionStartInput {
  challengeType: ChallengeType;
  baseChallengeValue: number;
  challengeValue: number;
  difficultyStage: number;
}

export const getMissionStartSettings = ({
  challengeType,
  baseChallengeValue,
  challengeValue,
  difficultyStage,
}: MissionStartInput) => {
  const sliceSize =
    challengeType === "count"
      ? baseChallengeValue || challengeValue
      : 30;
  const ranges = getTierRanges(sliceSize);
  const rangeIndex = Math.max(
    0,
    Math.min(difficultyStage - 1, ranges.length - 1),
  );
  const currentRange = ranges[rangeIndex];

  return {
    totalLevels: ranges.length,
    challengeValue:
      challengeType === "count" && currentRange
        ? currentRange.size
        : challengeValue,
  };
};
