import { useEffect } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore, type SubMode } from "../../../store/useGameStore";
import { getChoiceOptions } from "../gameEngine";

interface UseChoicePresentationProps {
  countries: CountryData[];
  subMode: SubMode;
  mode: "identify" | "reverse" | "pin";
  pinDirection: "locate" | "identify";
  gameStatus: "idle" | "playing" | "finished";
  currentCountryCode: string | null;
  setChoices: (choices: string[]) => void;
  setChoiceCodes: (codes: string[]) => void;
}

export const useChoicePresentation = ({
  countries,
  subMode,
  mode,
  pinDirection,
  gameStatus,
  currentCountryCode,
  setChoices,
  setChoiceCodes,
}: UseChoicePresentationProps) => {
  useEffect(() => {
    if (
      (mode === "reverse" || (mode === "pin" && pinDirection === "identify")) &&
      gameStatus === "playing" &&
      currentCountryCode
    ) {
      const { choiceCodes } = useGameStore.getState().session;
      if (choiceCodes.length > 0) {
        const options = getChoiceOptions(choiceCodes, countries, subMode);
        setChoices(options.choices);
        setChoiceCodes(options.choiceCodes);
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
};
