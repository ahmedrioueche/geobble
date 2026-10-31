import { useCallback } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { getTargetPool, isCountChallengeComplete, pickRandom } from "../gameRules";
import { getMissionStartSettings } from "../missionProgression";

interface UseMissionProgressionProps {
  countries: CountryData[];
  random?: () => number;
  generateChoices: (
    target: CountryData,
    subMode: "name" | "flag" | "capital",
  ) => void;
  finishGame: () => void;
}

export const useMissionProgression = ({
  countries,
  random = Math.random,
  generateChoices,
  finishGame,
}: UseMissionProgressionProps) => {
  const setCurrentCountry = useGameStore((state) => state.setCurrentCountry);
  const recordPlayedCountry = useGameStore((state) => state.recordPlayedCountry);
  const setMissionId = useGameStore((state) => state.setMissionId);
  const setFeedback = useGameStore((state) => state.setFeedback);
  const setRevealed = useGameStore((state) => state.setRevealed);
  const setPinLocation = useGameStore((state) => state.setPinLocation);
  const setTotalLevels = useGameStore((state) => state.setTotalLevels);
  const setChallenge = useGameStore((state) => state.setChallenge);
  const setScore = useGameStore((state) => state.setScore);
  const setStreak = useGameStore((state) => state.setStreak);
  const setGameStatus = useGameStore((state) => state.setGameStatus);

  const nextQuestion = useCallback(() => {
    const state = useGameStore.getState();
    if (countries.length === 0 || state.gameStatus !== "playing") return;
    if (
      isCountChallengeComplete(
        state.challengeType,
        state.challengeValue,
        state.totalAttempts,
      )
    ) {
      return;
    }

    if (
      state.challengeType === "world" &&
      state.totalQuestions >= countries.length
    ) {
      finishGame();
      return;
    }

    const targetPool = getTargetPool({
      countries,
      challengeType: state.challengeType,
      challengeValue: state.challengeValue,
      difficultyStage: state.difficultyStage,
      unlockedStage: state.unlockedStage,
      playedCountryCodes: state.playedCountryCodes,
      sessionPlayedCodes: state.sessionPlayedCodes,
    });
    const target = pickRandom(targetPool, random);
    if (!target) {
      finishGame();
      return;
    }

    setFeedback(null);
    setRevealed(false);
    setPinLocation(null);
    setCurrentCountry(target.cca3);
    recordPlayedCountry(target.cca3);
    setMissionId(Date.now().toString());

    if (
      state.mode === "reverse" ||
      (state.mode === "pin" && state.pinDirection === "identify")
    ) {
      generateChoices(target, state.subMode);
    }
  }, [
    countries,
    random,
    finishGame,
    generateChoices,
    setCurrentCountry,
    recordPlayedCountry,
    setMissionId,
    setFeedback,
    setRevealed,
    setPinLocation,
  ]);

  const startGame = useCallback(() => {
    const state = useGameStore.getState();
    const { totalLevels, challengeValue } = getMissionStartSettings({
      challengeType: state.challengeType,
      baseChallengeValue: state.baseChallengeValue,
      challengeValue: state.challengeValue,
      difficultyStage: state.difficultyStage,
    });

    setTotalLevels(totalLevels);
    if (
      state.challengeType === "count" &&
      challengeValue !== state.challengeValue
    ) {
      setChallenge("count", challengeValue);
    }

    setScore(0);
    setStreak(0);
    setGameStatus("playing");
    nextQuestion();
  }, [
    setTotalLevels,
    setChallenge,
    setScore,
    setStreak,
    setGameStatus,
    nextQuestion,
  ]);

  return { startGame, nextQuestion };
};
