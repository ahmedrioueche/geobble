import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { fetchCountries } from '../../data/country-data';
import type { CountryData } from '../../data/country-data';
import { nameMapping } from '../../data/name-mapping';

export const useGameLogic = () => {
  const { 
    score, setScore, 
    streak, setStreak, 
    currentCountryCode, setCurrentCountry,
    mode, setChoices,
    setGameStatus 
  } = useGameStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      const data = await fetchCountries();
      setCountries(data);
      setLoading(false);
    };
    initData();
  }, []);

  const nextQuestion = useCallback(() => {
    if (countries.length === 0) return;
    
    // Pick a target
    const randomIndex = Math.floor(Math.random() * countries.length);
    const target = countries[randomIndex];
    setCurrentCountry(target.cca3);

    // If reverse mode, generate 4 unique choices
    if (mode === 'reverse') {
      const choiceNames = [target.name];
      while (choiceNames.length < 4) {
        const randomDistractor = countries[Math.floor(Math.random() * countries.length)].name;
        if (!choiceNames.includes(randomDistractor)) {
          choiceNames.push(randomDistractor);
        }
      }
      // Shuffle choices
      setChoices(choiceNames.sort(() => Math.random() - 0.5));
    }
  }, [countries, setCurrentCountry, mode, setChoices]);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setGameStatus('playing');
    nextQuestion();
  }, [setScore, setStreak, setGameStatus, nextQuestion]);

  const submitAnswer = useCallback((selectedName: string) => {
    if (!currentCountryCode || !countries.length) return false;

    const targetCountry = countries.find(c => c.cca3 === currentCountryCode);
    if (!targetCountry) return false;

    const mappedSelectedName = nameMapping[selectedName] || selectedName;
    const isCorrect = 
      mappedSelectedName.toLowerCase() === targetCountry.name.toLowerCase();

    if (isCorrect) {
      setScore(score + 10 * (streak + 1));
      setStreak(streak + 1);
      nextQuestion();
    } else {
      setStreak(0);
    }

    return isCorrect;
  }, [currentCountryCode, countries, score, setScore, streak, setStreak, nextQuestion]);

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
    currentCountry: countries.find(c => c.cca3 === currentCountryCode)
  };
};
