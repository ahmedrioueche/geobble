import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../data/country-data";
import { fetchCountries } from "../../data/country-data";
import { getDifficulty } from "../../data/difficulty-ranking";
import { nameMapping } from "../../data/name-mapping";
import { normalizeCountryName } from "../../utils/name-normalizer";
import { useModalStore } from "../../store/modal";
import { useGameStore, type SubMode } from "../../store/useGameStore";

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

    openModal("result", {
      score,
      accuracy,
      streak,
      correctAnswers: correctAttempts,
      totalQuestions: challengeType === "count" ? challengeValue : totalQuestions,
      isVictory,
      difficultyStage,
      challengeType,
      isWorldCompletion:
        challengeType === "world" && totalQuestions >= countries.length,
    });
  }, [
    setGameStatus,
    challengeType,
    totalAttempts,
    correctAttempts,
    openModal,
    score,
    streak,
    difficultyStage,
    challengeValue,
    totalQuestions,
    countries.length,
  ]);

  const nextQuestion = useCallback(() => {
    if (countries.length === 0) return;

    // 0. Check if world mode should end
    if (challengeType === "world" && totalQuestions >= countries.length) {
      finishGame();
      return;
    }

    // 1. Determine the pool of available countries (Deduplication)
    let available = countries.filter(
      (c) => !sessionPlayedCodes.includes(c.cca3),
    );

    // If we've played everything, or it's a world mode, end the game
    if (available.length === 0) {
      if (challengeType === "world") {
        finishGame();
        return;
      }
      // Fallback: reset mission memory for count/timer if we ran out of new countries in the session
      available = countries.filter((c) => !playedCountryCodes.includes(c.cca3));
      if (available.length === 0) available = countries;
    }

    // 2. Application of Difficulty Logic for 'world' mode
    let targetPool = available;
    if (challengeType === "world") {
      // Find the lowest difficulty stage available in the current pending set
      const minDifficulty = Math.min(
        ...available.map((c) => getDifficulty(c.cca3)),
      );
      targetPool = available.filter(
        (c) => getDifficulty(c.cca3) === minDifficulty,
      );
    }

    // 3. Pick a target
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
  ]);

  // Mission Completion Watcher
  useEffect(() => {
    if (gameStatus === "playing" && challengeType === "count" && totalAttempts >= challengeValue) {
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
    setScore(0);
    setStreak(0);
    setGameStatus("playing");
    nextQuestion();
  }, [setScore, setStreak, setGameStatus, nextQuestion]);

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
