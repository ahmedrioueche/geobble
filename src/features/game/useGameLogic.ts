import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../data/country-data";
import { fetchCountries } from "../../data/country-data";
import {
  getDifficulty,
  getTierRanges,
  SORTED_POOL,
} from "../../data/difficulty-ranking";
import { nameMapping } from "../../data/name-mapping";
import { useModalStore } from "../../store/modal";
import { useGameStore, type SubMode } from "../../store/useGameStore";
import { normalizeCountryName } from "../../utils/name-normalizer";

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useGameLogic = () => {
  const {
    score,
    setScore,
    streak,
    setStreak,
    currentCountryCode,
    setCurrentCountry,
    mode,
    subMode,
    setChoices,
    gameStatus,
    setGameStatus,
    setMissionId,
    setFeedback,
    setRevealed,
    challengeType,
    challengeValue,
    totalQuestions,
    totalAttempts,
    correctAttempts,
    playedCountryCodes,
    sessionPlayedCodes,
    recordPlayedCountry,
    timeRemaining,
    setTimeRemaining,
    difficultyStage,
    setStreakLost,
    startTime,
    unlockNextStage,
    unlockedStage,
    setChallenge,
  } = useGameStore();
  const { openModal } = useModalStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countryResponse, mapResponse] = await Promise.all([
          fetchCountries(),
          fetch("/data/world.json"),
        ]);

        if (!mapResponse.ok) throw new Error("Failed to load map data");
        const mapData = await mapResponse.json();

        // Extract available numeric/id codes from TopoJSON
        const availableMapIds = new Set(
          (mapData.objects.countries.geometries as any[]).map((g) =>
            g.id?.toString(),
          ),
        );

        // Filter countries to only those that can be resolved on the map
        const filtered = countryResponse.filter(
          (c) =>
            availableMapIds.has(c.cca3) ||
            availableMapIds.has(c.cca2) ||
            availableMapIds.has(c.ccn3) ||
            availableMapIds.has(parseInt(c.ccn3 || "0", 10)?.toString()),
        );

        setCountries(filtered);
      } catch (err) {
        console.error("Error setting up tactical data:", err);
        // Fallback to all if map fails
        const data = await fetchCountries();
        setCountries(data);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const generateChoices = useCallback(
    (target: CountryData, currentSubMode: SubMode) => {
      if (countries.length === 0) return;

      const getChoiceValue = (c: CountryData) => {
        if (currentSubMode === "flag") return c.cca2;
        if (currentSubMode === "capital") return c.capital[0];
        return c.name;
      };

      const targetValue = getChoiceValue(target);
      const distractors: string[] = [];

      // 1. Prioritize same SUBREGION
      const subregionPool = countries
        .filter(
          (c) => c.subregion === target.subregion && c.cca3 !== target.cca3,
        )
        .sort(() => Math.random() - 0.5);

      for (const c of subregionPool) {
        if (distractors.length >= 3) break;
        const val = getChoiceValue(c);
        if (!distractors.includes(val) && val !== targetValue) {
          distractors.push(val);
        }
      }

      // 2. Fallback to same REGION (Continent)
      if (distractors.length < 3) {
        const regionPool = countries
          .filter((c) => c.region === target.region && c.cca3 !== target.cca3)
          .sort(() => Math.random() - 0.5);

        for (const c of regionPool) {
          if (distractors.length >= 3) break;
          const val = getChoiceValue(c);
          if (!distractors.includes(val) && val !== targetValue) {
            distractors.push(val);
          }
        }
      }

      // 3. Last resort fallback: GLOBAL
      if (distractors.length < 3) {
        const globalPool = [...countries]
          .filter((c) => c.cca3 !== target.cca3)
          .sort(() => Math.random() - 0.5);

        for (const c of globalPool) {
          if (distractors.length >= 3) break;
          const val = getChoiceValue(c);
          if (!distractors.includes(val) && val !== targetValue) {
            distractors.push(val);
          }
        }
      }

      const finalChoices = [targetValue, ...distractors].sort(
        () => Math.random() - 0.5,
      );
      setChoices(finalChoices);
    },
    [countries, setChoices],
  );

  const finishGame = useCallback(() => {
    setGameStatus("finished");

    // Denominator is always totalAttempts as it reflects human interaction
    const denom = totalAttempts;
    const accuracy = denom > 0 ? correctAttempts / denom : 0;

    let isVictory = false;
    if (challengeType === "timer") {
      isVictory = correctAttempts >= 10;
    } else {
      isVictory = accuracy >= 0.8;
    }

    if (isVictory) {
      unlockNextStage();
    }

    const timeElapsed = startTime ? Date.now() - startTime : 0;

    const sliceSize = challengeType === "count" ? challengeValue || 30 : 30;
    const ranges = getTierRanges(sliceSize);
    const currentRange = ranges[difficultyStage - 1] || ranges[0];

    openModal("result", {
      score,
      accuracy,
      streak,
      correctAnswers: correctAttempts,
      totalQuestions:
        challengeType === "world" ? countries.length : currentRange.size,
      isVictory,
      difficultyStage,
      challengeType,
      challengeValue,
      isWorldCompletion:
        challengeType === "world" && totalQuestions >= countries.length,
      timeElapsed,
    });
  }, [
    setGameStatus,
    totalQuestions,
    totalAttempts,
    correctAttempts,
    challengeType,
    challengeValue,
    countries.length,
    openModal,
    score,
    streak,
    difficultyStage,
    startTime,
  ]);

  const nextQuestion = useCallback(() => {
    if (countries.length === 0) return;

    // 0. Check if world mode should end
    if (challengeType === "world" && totalQuestions >= countries.length) {
      finishGame();
      return;
    }

    // 1. Determine the pool of available countries
    // 2. Define the base target pool based on mode
    let targetPool: any[] = [];
    const state = useGameStore.getState();

    if (state.challengeType === "world") {
      // World mode: Filter by current unlocked progression and excluded session-played
      targetPool = countries.filter(
        (c) =>
          getDifficulty(c.cca3) <= state.unlockedStage &&
          !sessionPlayedCodes.includes(c.cca3),
      );

      if (targetPool.length === 0) {
        finishGame();
        return;
      }
    } else {
      // Dynamic Stages for Count/Timer mode
      const sliceSize = state.challengeType === "count" ? state.challengeValue : 30;
      const ranges = getTierRanges(sliceSize);

      // Ensure stage is within calculated ranges (clamp to last available range)
      // Safety: fallback to the first range if ranges are somehow empty, or last range if overflow
      const rangeIdx = Math.max(0, Math.min(state.difficultyStage - 1, ranges.length - 1));
      const currentRange = ranges[rangeIdx];

      if (!currentRange) {
        finishGame();
        return;
      }

      const levelCodes = shuffleArray(
        SORTED_POOL.slice(currentRange.start, currentRange.end),
      );

      const stageCountries = countries.filter((c) =>
        levelCodes.includes(c.cca3),
      );

      if (stageCountries.length === 0) {
        // Fallback for safety if stage is empty/invalid
        finishGame();
        return;
      }

      // Filter out what's already been played IN THE CURRENT MISSION
      targetPool = stageCountries.filter(
        (c) => !playedCountryCodes.includes(c.cca3),
      );

      // If we've played all countries in this stage during this mission,
      // allow repeats to fulfill the mission requirements (e.g. mission count > pool size)
      if (targetPool.length === 0) {
        targetPool = stageCountries;
      }
    }

    // 4. Pick a target
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    const target = targetPool[randomIndex];

    // 4. Reset feedback and revealed state
    setFeedback(null);
    setRevealed(false);

    // 5. Set new target and record it
    setCurrentCountry(target.cca3);
    recordPlayedCountry(target.cca3);
    setMissionId(Date.now().toString());

    // 6. If reverse mode, generate 4 unique choices based on SUBMODE
    if (mode === "reverse") {
      generateChoices(target, subMode);
    }
  }, [
    countries,
    playedCountryCodes,
    sessionPlayedCodes,
    challengeType,
    totalQuestions,
    finishGame,
    setCurrentCountry,
    recordPlayedCountry,
    setMissionId,
    setFeedback,
    mode,
    subMode,
    generateChoices,
    setRevealed,
    difficultyStage,
    unlockedStage,
  ]);

  // Mission Completion Watcher
  useEffect(() => {
    if (
      gameStatus === "playing" &&
      challengeType === "count" &&
      totalAttempts >= challengeValue
    ) {
      // Small delay to let the final feedback play
      const timer = setTimeout(() => {
        finishGame();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, challengeType, totalAttempts, challengeValue, finishGame]);

  // Effect to regenerate choices INSTANTLY when subMode changes in Reverse mode
  useEffect(() => {
    if (mode === "reverse" && gameStatus === "playing" && currentCountryCode) {
      const target = countries.find((c) => c.cca3 === currentCountryCode);
      if (target) {
        generateChoices(target, subMode);
      }
    }
  }, [
    subMode,
    mode,
    gameStatus,
    currentCountryCode,
    countries,
    generateChoices,
  ]);

  // Timer Engine
  useEffect(() => {
    let timer: any;
    if (gameStatus === "playing" && challengeType === "timer") {
      timer = setInterval(() => {
        if (timeRemaining <= 0) {
          finishGame();
          clearInterval(timer);
        } else {
          setTimeRemaining(timeRemaining - 1);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [
    gameStatus,
    challengeType,
    timeRemaining,
    setGameStatus,
    setTimeRemaining,
    finishGame,
  ]);

  const startGame = useCallback(() => {
    const state = useGameStore.getState();
    // Synchronize mission goal with actual tier size (handles merged remainders)
    const sliceSize = state.challengeType === "count" ? state.challengeValue : 30;
    const ranges = getTierRanges(sliceSize);

    // Ensure stage is within calculated ranges (clamp to last available range)
    const rangeIdx = Math.max(0, Math.min(state.difficultyStage - 1, ranges.length - 1));
    const currentRange = ranges[rangeIdx];

    if (
      state.challengeType === "count" &&
      currentRange &&
      currentRange.size !== state.challengeValue
    ) {
      setChallenge("count", currentRange.size);
    }

    setScore(0);
    setStreak(0);
    setGameStatus("playing");
    nextQuestion();
  }, [
    setScore,
    setStreak,
    setGameStatus,
    nextQuestion,
    challengeType,
    challengeValue,
    difficultyStage,
    setChallenge,
  ]);

  const submitAnswer = useCallback(
    (selectedIdentifier: string) => {
      if (!currentCountryCode || !countries.length) return false;

      const targetCountry = countries.find(
        (c) => c.cca3 === currentCountryCode,
      );
      if (!targetCountry) return false;

      let isCorrect = false;
      const normalizedTarget = normalizeCountryName(targetCountry.name);

      if (mode === "reverse") {
        // In reverse mode, selectedIdentifier is Name, Code (for flag), or Capital
        if (subMode === "flag") {
          isCorrect =
            selectedIdentifier.toLowerCase() ===
            targetCountry.cca2.toLowerCase();
        } else if (subMode === "capital") {
          isCorrect =
            selectedIdentifier.toLowerCase() ===
            targetCountry.capital[0].toLowerCase();
        } else {
          const normalizedSelected = normalizeCountryName(selectedIdentifier);
          isCorrect = normalizedSelected === normalizedTarget;
        }
      } else {
        // In identify mode, user clicks map, always giving the country name
        const mappedSelectedName =
          nameMapping[selectedIdentifier] || selectedIdentifier;
        const normalizedSelected = normalizeCountryName(mappedSelectedName);
        isCorrect = normalizedSelected === normalizedTarget;
      }

      if (isCorrect) {
        setScore(score + 10 * (streak + 1));
        setStreak(streak + 1);
      } else {
        if (streak > 0) setStreakLost(streak);
        setStreak(0);
      }

      return isCorrect;
    },
    [
      currentCountryCode,
      countries,
      score,
      setScore,
      streak,
      setStreak,
      setStreakLost,
      mode,
      subMode,
    ],
  );

  const skipQuestion = useCallback(() => {
    if (streak > 0) setStreakLost(streak);
    setStreak(0);
    nextQuestion();
  }, [setStreak, nextQuestion, streak, setStreakLost]);

  return {
    countries,
    loading,
    startGame,
    submitAnswer,
    skipQuestion,
    nextQuestion,
    currentCountry: countries.find((c) => c.cca3 === currentCountryCode),
  };
};
