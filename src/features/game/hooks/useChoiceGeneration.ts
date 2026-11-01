import { useCallback, useEffect } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore, type SubMode } from "../../../store/useGameStore";
import { generateChoiceCountries } from "../gameRules";

interface UseChoiceGenerationProps {
  countries: CountryData[];
  subMode: SubMode;
  mode: "identify" | "reverse" | "pin";
  pinDirection: "locate" | "identify";
  gameStatus: "idle" | "playing" | "finished";
  currentCountryCode: string | null;
  random: () => number;
  setChoices: (choices: string[]) => void;
  setChoiceCodes: (codes: string[]) => void;
}

const getChoiceValue = (country: CountryData, subMode: SubMode) => {
  if (subMode === "flag") return country.cca2 || "??";
  if (subMode === "capital") {
    return country.capital && country.capital.length > 0
      ? country.capital[0]
      : "No Capital";
  }
  return country.name || "Unknown";
};

export const useChoiceGeneration = ({
  countries,
  subMode,
  mode,
  pinDirection,
  gameStatus,
  currentCountryCode,
  random,
  setChoices,
  setChoiceCodes,
}: UseChoiceGenerationProps) => {
  const generateChoices = useCallback(
    (target: CountryData, currentSubMode: SubMode) => {
      if (countries.length === 0) return;

      const selectedCountries = generateChoiceCountries(
        target,
        countries,
        random,
      );
      const options = selectedCountries
        .map((country) => ({
          code: country.cca3,
          value: getChoiceValue(country, currentSubMode),
        }))
        .sort((first, second) => first.value.localeCompare(second.value));
      setChoiceCodes(options.map((option) => option.code));
      setChoices(options.map((option) => option.value));
    },
    [countries, random, setChoices, setChoiceCodes],
  );

  useEffect(() => {
    if (
      (mode === "reverse" || (mode === "pin" && pinDirection === "identify")) &&
      gameStatus === "playing" &&
      currentCountryCode
    ) {
      const { choiceCodes } = useGameStore.getState().session;
      if (choiceCodes.length > 0) {
        const options = choiceCodes
          .map((code) => {
            const country = countries.find((item) => item.cca3 === code);
            return {
              code,
              value: country ? getChoiceValue(country, subMode) : "Unknown",
            };
          })
          .sort((first, second) => first.value.localeCompare(second.value));
        setChoices(options.map((option) => option.value));
        setChoiceCodes(options.map((option) => option.code));
      }
    }
  }, [
    subMode,
    mode,
    pinDirection,
    gameStatus,
    currentCountryCode,
    countries,
    setChoices,
    setChoiceCodes,
  ]);

  return generateChoices;
};
