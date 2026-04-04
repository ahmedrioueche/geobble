import { useState, useEffect, useCallback } from 'react';
import { useGameStore, type SubMode } from '../../store/useGameStore';
import { fetchCountries } from '../../data/country-data';
import type { CountryData } from '../../data/country-data';
import { nameMapping } from '../../data/name-mapping';

export const useGameLogic = () => {
  const { 
    score, setScore, 
    streak, setStreak, 
    currentCountryCode, setCurrentCountry,
    mode, subMode, setChoices,
    gameStatus, setGameStatus,
    setMissionId,
    setFeedback,
    setRevealed
  } = useGameStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countryResponse, mapResponse] = await Promise.all([
          fetchCountries(),
          fetch("/data/world.json")
        ]);

        if (!mapResponse.ok) throw new Error("Failed to load map data");
        const mapData = await mapResponse.json();
        
        // Extract available numeric/id codes from TopoJSON
        const availableMapIds = new Set(
          (mapData.objects.countries.geometries as any[]).map(g => g.id?.toString())
        );

        // Filter countries to only those that can be resolved on the map
        const filtered = countryResponse.filter(c => 
          availableMapIds.has(c.cca3) || 
          availableMapIds.has(c.cca2) ||
          availableMapIds.has(c.ccn3) ||
          availableMapIds.has(parseInt(c.ccn3 || "0", 10)?.toString())
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

  const generateChoices = useCallback((target: CountryData, currentSubMode: SubMode) => {
    if (countries.length === 0) return;
    
    const getChoiceValue = (c: CountryData) => {
      if (currentSubMode === 'flag') return c.cca2;
      if (currentSubMode === 'capital') return c.capital[0];
      return c.name;
    };

    const targetValue = getChoiceValue(target);
    const choiceValues = [targetValue];
    
    while (choiceValues.length < 4) {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      const randomValue = getChoiceValue(randomCountry);
      if (!choiceValues.includes(randomValue)) {
        choiceValues.push(randomValue);
      }
    }
    
    setChoices(choiceValues.sort(() => Math.random() - 0.5));
  }, [countries, setChoices]);

  const nextQuestion = useCallback(() => {
    if (countries.length === 0) return;
    
    // Pick a target (Filter out current to avoid duplicates)
    const available = countries.filter(c => c.cca3 !== currentCountryCode);
    const pool = available.length > 0 ? available : countries;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const target = pool[randomIndex];
    
    // 1. Reset feedback and revealed state immediately upon picking next
    setFeedback(null);
    setRevealed(false);
    
    // 2. Set new target
    setCurrentCountry(target.cca3);
    setMissionId(Date.now().toString());

    // 3. If reverse mode, generate 4 unique choices based on SUBMODE
    if (mode === 'reverse') {
      generateChoices(target, subMode);
    }
  }, [countries, currentCountryCode, setCurrentCountry, setMissionId, setFeedback, mode, subMode, generateChoices]);

  // Effect to regenerate choices INSTANTLY when subMode changes in Reverse mode
  useEffect(() => {
    if (mode === 'reverse' && gameStatus === 'playing' && currentCountryCode) {
      const target = countries.find(c => c.cca3 === currentCountryCode);
      if (target) {
        generateChoices(target, subMode);
      }
    }
  }, [subMode, mode, gameStatus, currentCountryCode, countries, generateChoices]);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setGameStatus('playing');
    nextQuestion();
  }, [setScore, setStreak, setGameStatus, nextQuestion]);

  const submitAnswer = useCallback((selectedIdentifier: string) => {
    if (!currentCountryCode || !countries.length) return false;

    const targetCountry = countries.find(c => c.cca3 === currentCountryCode);
    if (!targetCountry) return false;

    let isCorrect = false;

    if (mode === 'reverse') {
      // In reverse mode, selectedIdentifier is Name, Code (for flag), or Capital
      if (subMode === 'flag') {
        isCorrect = selectedIdentifier.toLowerCase() === targetCountry.cca2.toLowerCase();
      } else if (subMode === 'capital') {
        isCorrect = selectedIdentifier.toLowerCase() === targetCountry.capital[0].toLowerCase();
      } else {
        isCorrect = selectedIdentifier.toLowerCase() === targetCountry.name.toLowerCase();
      }
    } else {
      // In identify mode, user clicks map, always giving the country name
      const mappedSelectedName = nameMapping[selectedIdentifier] || selectedIdentifier;
      isCorrect = mappedSelectedName.toLowerCase() === targetCountry.name.toLowerCase();
    }

    if (isCorrect) {
      setScore(score + 10 * (streak + 1));
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }

    return isCorrect;
  }, [currentCountryCode, countries, score, setScore, streak, setStreak, mode, subMode]);

  const skipQuestion = useCallback(() => {
    setStreak(0);
    nextQuestion();
  }, [setStreak, nextQuestion]);

  return {
    countries,
    loading,
    startGame,
    submitAnswer,
    skipQuestion,
    nextQuestion,
    currentCountry: countries.find(c => c.cca3 === currentCountryCode)
  };
};
