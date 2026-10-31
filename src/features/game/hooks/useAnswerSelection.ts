import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useMapUiStore } from "../../../store/useMapUiStore";
import {
  isCorrectAnswer,
  resolveMapCountry,
  type RoundAction,
} from "../gameRules";

interface UseAnswerSelectionProps {
  countries: CountryData[];
  currentCountry: CountryData | undefined;
  gameStatus: "idle" | "playing" | "finished";
  mode: "identify" | "reverse" | "pin";
  pinDirection: "locate" | "identify";
  subMode: "name" | "flag" | "capital";
  feedback: "correct" | "wrong" | null;
  applyRoundAction: (
    action: RoundAction,
    clickedName: string,
    clickedCode?: string | null,
  ) => void;
}

export const useAnswerSelection = ({
  countries,
  currentCountry,
  gameStatus,
  mode,
  pinDirection,
  subMode,
  feedback,
  applyRoundAction,
}: UseAnswerSelectionProps) => {
  const [clickedCountry, setClickedCountry] = useState<CountryData | null>(null);
  const setPinLocation = useGameStore((state) => state.setPinLocation);
  const setTempHighlightCode = useMapUiStore(
    (state) => state.setTempHighlightCode,
  );

  useEffect(() => {
    if (!clickedCountry) return;
    const timer = setTimeout(() => setClickedCountry(null), 15000);
    return () => clearTimeout(timer);
  }, [clickedCountry]);

  const handleCountryClick = useCallback(
    (name: string, code: string, coordinates?: [number, number]) => {
      const isPinLocate = mode === "pin" && pinDirection === "locate";
      if ((mode !== "identify" && !isPinLocate) || feedback) return;

      const countryData = resolveMapCountry(name, code, countries);
      if (gameStatus === "playing") {
        if (!currentCountry) return;
        if (isPinLocate && coordinates) setPinLocation(coordinates);

        applyRoundAction(
          {
            type: "answer",
            isCorrect: isCorrectAnswer(
              { type: "map", country: countryData },
              currentCountry,
              subMode,
            ),
            ignoreIncorrectWhenRevealed: true,
          },
          name,
          code,
        );
        return;
      }

      setClickedCountry(countryData);
      if (countryData?.cca3) {
        setTempHighlightCode(countryData.cca3);
        setTimeout(() => setTempHighlightCode(null), 1000);
      }
    },
    [
      mode,
      pinDirection,
      feedback,
      countries,
      gameStatus,
      currentCountry,
      subMode,
      setPinLocation,
      applyRoundAction,
      setTempHighlightCode,
    ],
  );

  const handleChoiceSelect = useCallback(
    (choice: string) => {
      if (feedback || !currentCountry) return;
      applyRoundAction(
        {
          type: "answer",
          isCorrect: isCorrectAnswer(
            { type: "choice", value: choice },
            currentCountry,
            subMode,
          ),
        },
        choice,
      );
    },
    [feedback, currentCountry, subMode, applyRoundAction],
  );

  return {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
  };
};
