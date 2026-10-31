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
      setChoiceCodes(selectedCountries.map((country) => country.cca3));
      setChoices(
        selectedCountries
          .map((country) => getChoiceValue(country, currentSubMode))
          .sort((a, b) => a.localeCompare(b)),
      );
    },
    [countries, random, setChoices, setChoiceCodes],
  );

  useEffect(() => {
    if (
      (mode === "reverse" || (mode === "pin" && pinDirection === "identify")) &&
      gameStatus === "playing" &&
      currentCountryCode
    ) {
      const { choiceCodes } = useGameStore.getState();
      if (choiceCodes.length > 0) {
        const updatedChoices = choiceCodes
          .map((code) => {
            const country = countries.find((item) => item.cca3 === code);
            return country ? getChoiceValue(country, subMode) : "Unknown";
          })
          .sort((a, b) => a.localeCompare(b));
        setChoices(updatedChoices);
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
  ]);

  return generateChoices;
};
