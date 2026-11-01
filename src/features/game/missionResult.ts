import { getTierRanges } from "../../data/difficulty-ranking";
import type { ChallengeType } from "../../store/useGameStore";
import { systemGameClock } from "../../store/gameClock";

interface MissionResultInput {
  score: number;
  maxStreak: number;
  totalAttempts: number;
  correctAttempts: number;
  challengeType: ChallengeType;
  challengeValue: number;
  difficultyStage: number;
  totalQuestions: number;
  countriesCount: number;
  startTime: number | null;
  totalLevels: number;
  now?: number;
}

export const buildMissionResult = ({
  score,
  maxStreak,
  totalAttempts,
  correctAttempts,
  challengeType,
  challengeValue,
  difficultyStage,
  totalQuestions,
  countriesCount,
  startTime,
  totalLevels,
  now = systemGameClock(),
}: MissionResultInput) => {
  const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
  const isVictory =
    challengeType === "timer"
      ? correctAttempts >= 10
      : accuracy >= 0.8;
  const sliceSize = challengeType === "count" ? challengeValue || 30 : 30;
  const ranges = getTierRanges(sliceSize);
  const rangeIndex = Math.max(
    0,
    Math.min(difficultyStage - 1, ranges.length - 1),
  );
  const currentRange = ranges[rangeIndex] || { size: sliceSize };

  return {
    score,
    accuracy,
    streak: maxStreak,
    correctAnswers: correctAttempts,
    totalQuestions:
      challengeType === "world" ? countriesCount || 240 : currentRange.size,
    isVictory,
    difficultyStage,
    challengeType,
    challengeValue,
    isWorldCompletion:
      (challengeType === "world" &&
        totalQuestions >= countriesCount &&
        countriesCount > 0) ||
      (challengeType === "count" &&
        difficultyStage === totalLevels &&
        isVictory),
    timeElapsed: startTime ? now - startTime : 0,
    totalLevels,
  };
};
