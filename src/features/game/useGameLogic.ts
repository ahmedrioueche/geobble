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
    setChoiceCodes,
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
    playedCountryCodes: _unusedPlayed,
    sessionPlayedCodes: _unusedSession,
    recordPlayedCountry,
    setTimeRemaining,
    difficultyStage,
    setStreakLost,
    startTime,
    unlockNextStage,
    unlockedStage: _unusedUnlocked,
    setChallenge,
    setTotalLevels,
    totalLevels,
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

      const distractorCodes: string[] = [];

      // 1. Prioritize same SUBREGION
      const subregionPool = countries
        .filter(
          (c) => c.subregion === target.subregion && c.cca3 !== target.cca3,
        )
        .sort(() => Math.random() - 0.5);

      for (const c of subregionPool) {
        if (distractorCodes.length >= 3) break;
        if (!distractorCodes.includes(c.cca3)) {
          distractorCodes.push(c.cca3);
        }
      }

      // 2. Fallback to same REGION (Continent)
      if (distractorCodes.length < 3) {
        const regionPool = countries
          .filter((c) => c.region === target.region && c.cca3 !== target.cca3)
          .sort(() => Math.random() - 0.5);

        for (const c of regionPool) {
          if (distractorCodes.length >= 3) break;
          if (!distractorCodes.includes(c.cca3)) {
            distractorCodes.push(c.cca3);
          }
        }
      }

      // 3. Last resort fallback: GLOBAL
      if (distractorCodes.length < 3) {
        const globalPool = [...countries]
          .filter((c) => c.cca3 !== target.cca3)
          .sort(() => Math.random() - 0.5);

        for (const c of globalPool) {
          if (distractorCodes.length >= 3) break;
          if (!distractorCodes.includes(c.cca3)) {
            distractorCodes.push(c.cca3);
          }
        }
      }

      const finalCodes = [target.cca3, ...distractorCodes];
      setChoiceCodes(finalCodes);

      // Now map to display values based on current subMode and SORT them
      const getChoiceValue = (code: string) => {
        const c = countries.find((x) => x.cca3 === code);
        if (!c) return "Unknown";
        if (currentSubMode === "flag") return c.cca2 || "??";
        if (currentSubMode === "capital") return (c.capital && c.capital.length > 0) ? c.capital[0] : "No Capital";
        return c.name || "Unknown";
      };

      const finalChoices = finalCodes
        .map(getChoiceValue)
        .sort((a, b) => a.localeCompare(b));
      setChoices(finalChoices);
    },
    [countries, setChoices, setChoiceCodes],
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
    const rangeIdx = Math.max(0, Math.min(difficultyStage - 1, ranges.length - 1));
    const currentRange = ranges[rangeIdx] || { size: sliceSize };

    openModal("result", {
      score,
      accuracy,
      streak,
      correctAnswers: correctAttempts,
      totalQuestions:
        challengeType === "world" ? (countries.length || 240) : currentRange.size,
      isVictory,
      difficultyStage,
      challengeType,
      challengeValue,
      isWorldCompletion:
        (challengeType === "world" && totalQuestions >= countries.length && countries.length > 0) ||
        (challengeType === "count" && difficultyStage === totalLevels && isVictory),
      timeElapsed,
      totalLevels,
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
    totalLevels,
  ]);

  const nextQuestion = useCallback(() => {
    const freshState = useGameStore.getState();
    if (countries.length === 0) return;

    // 0. Check if world mode should end
    if (freshState.challengeType === "world" && freshState.totalQuestions >= countries.length) {
      finishGame();
      return;
    }

    // 1. Determine the pool of available countries
    let targetPool: CountryData[] = [];

    if (freshState.challengeType === "world") {
      // World mode: Filter by current unlocked progression and excluded session-played
      targetPool = countries.filter(
        (c) =>
          getDifficulty(c.cca3) <= freshState.unlockedStage &&
          !freshState.sessionPlayedCodes.includes(c.cca3),
      );

      if (targetPool.length === 0) {
        finishGame();
        return;
      }
    } else {
      // Dynamic Stages for Count/Timer mode
      const sliceSize = freshState.challengeType === "count" ? freshState.challengeValue : 30;
      const ranges = getTierRanges(sliceSize);

      // Ensure stage is within calculated ranges
      const rangeIdx = Math.max(0, Math.min(freshState.difficultyStage - 1, ranges.length - 1));
      const currentRange = ranges[rangeIdx];

      if (!currentRange) {
        finishGame();
        return;
      }

      // Codes defined for THIS level
      const levelCodes = SORTED_POOL.slice(currentRange.start, currentRange.end);

      // Filter countries from the master list that are in THIS level
      const stageCountries = countries.filter((c) =>
        levelCodes.includes(c.cca3),
      );

      if (stageCountries.length === 0) {
        finishGame();
        return;
      }

      // Filter out what's already been played IN THE CURRENT MISSION (playedCountryCodes)
      // Use freshState to ensure we have the absolute latest record
      targetPool = stageCountries.filter(
        (c) => !freshState.playedCountryCodes.includes(c.cca3),
      );

      // If we've played all unique countries in this tier, the mission for this tier is done
      if (targetPool.length === 0) {
        finishGame();
        return;
      }
    }

    // 2. Pick a target
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    const target = targetPool[randomIndex];

    // 3. Reset feedback and revealed state
    setFeedback(null);
    setRevealed(false);

    // 4. Set new target and record it
    setCurrentCountry(target.cca3);
    recordPlayedCountry(target.cca3);
    setMissionId(Date.now().toString());

    // 5. If reverse mode, generate choices
    if (freshState.mode === "reverse") {
      generateChoices(target, freshState.subMode);
    }
  }, [
    countries,
    finishGame,
    setCurrentCountry,
    recordPlayedCountry,
    setMissionId,
    setFeedback,
    generateChoices,
    setRevealed,
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

  // Effect to update labels (and sort them) when subMode changes in Reverse mode
  // This keeps the countries stable but rearranges them alphabetically based on the current DISPLAY value
  useEffect(() => {
    if (mode === "reverse" && gameStatus === "playing" && currentCountryCode) {
      const state = useGameStore.getState();
      if (state.choiceCodes.length > 0) {
        const getChoiceValue = (code: string) => {
          const c = countries.find((x) => x.cca3 === code);
          if (!c) return "Unknown";
          if (subMode === "flag") return c.cca2 || "??";
          if (subMode === "capital") return (c.capital && c.capital.length > 0) ? c.capital[0] : "No Capital";
          return c.name || "Unknown";
        };

        const updatedChoices = [...state.choiceCodes]
          .map(getChoiceValue)
          .sort((a, b) => a.localeCompare(b));
        setChoices(updatedChoices);
      }
    }
  }, [
    subMode,
    mode,
    gameStatus,
    currentCountryCode,
    countries,
    setChoices,
  ]);

  // Timer Engine
  useEffect(() => {
    let timer: any;
    if (gameStatus === "playing" && challengeType === "timer") {
      timer = setInterval(() => {
        const { timeRemaining: currentRemaining } = useGameStore.getState();
        if (currentRemaining <= 0) {
          finishGame();
          clearInterval(timer);
        } else {
          setTimeRemaining(currentRemaining - 1);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [
    gameStatus,
    challengeType,
    finishGame,
    setTimeRemaining,
  ]);

  const startGame = useCallback(() => {
    const state = useGameStore.getState();
    // Synchronize mission goal with actual tier size (handles merged remainders)
    const sliceSize = state.challengeType === "count" ? state.challengeValue : 30;
    const ranges = getTierRanges(sliceSize);
    const calculatedMaxLevels = ranges.length;

    // Set stable totalLevels once at start
    setTotalLevels(calculatedMaxLevels);

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
    setFeedback,
    generateChoices,
    setRevealed,
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
