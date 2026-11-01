import { useCallback } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useGameUiStore } from "../../../store/useGameUiStore";
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
  const setFeedback = useGameUiStore((state) => state.setFeedback);
  const setRevealed = useGameStore((state) => state.setRevealed);
  const setPendingAdvanceAt = useGameStore(
    (state) => state.setPendingAdvanceAt,
  );
  const setPinLocation = useGameStore((state) => state.setPinLocation);
  const setTotalLevels = useGameStore((state) => state.setTotalLevels);
  const setChallenge = useGameStore((state) => state.setChallenge);
  const setScore = useGameStore((state) => state.setScore);
  const setStreak = useGameStore((state) => state.setStreak);
  const setGameStatus = useGameStore((state) => state.setGameStatus);

  const nextQuestion = useCallback(() => {
    const state = useGameStore.getState();
    if (countries.length === 0 || state.session.gameStatus !== "playing") return;
    if (
      isCountChallengeComplete(
        state.session.challengeType,
        state.session.challengeValue,
        state.session.totalAttempts,
      )
    ) {
      return;
    }

    if (
      state.session.challengeType === "world" &&
      state.session.totalQuestions >= countries.length
    ) {
      finishGame();
      return;
    }

    const targetPool = getTargetPool({
      countries,
      challengeType: state.session.challengeType,
      challengeValue: state.session.challengeValue,
      difficultyStage: state.session.difficultyStage,
      unlockedStage: state.unlockedStage,
      playedCountryCodes: state.session.playedCountryCodes,
      sessionPlayedCodes: state.session.sessionPlayedCodes,
    });
    const target = pickRandom(targetPool, random);
    if (!target) {
      finishGame();
      return;
    }

    setPendingAdvanceAt(null);
    setFeedback(null);
    setRevealed(false);
    setPinLocation(null);
    setCurrentCountry(target.cca3);
    recordPlayedCountry(target.cca3);
    setMissionId(
      `${state.session.id ?? "session"}:${state.session.totalQuestions + 1}`,
    );

    if (
      state.session.mode === "reverse" ||
      (state.session.mode === "pin" && state.session.pinDirection === "identify")
    ) {
      generateChoices(target, state.session.subMode);
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
    setPendingAdvanceAt,
    setPinLocation,
  ]);

  const startGame = useCallback(() => {
    const state = useGameStore.getState();
    const { totalLevels, challengeValue } = getMissionStartSettings({
      challengeType: state.session.challengeType,
      baseChallengeValue: state.session.baseChallengeValue,
      challengeValue: state.session.challengeValue,
      difficultyStage: state.session.difficultyStage,
    });

    setTotalLevels(totalLevels);
    if (
      state.session.challengeType === "count" &&
      challengeValue !== state.session.challengeValue
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
