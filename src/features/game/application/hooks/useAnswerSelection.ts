import { useCallback, useEffect, useState } from "react";
import type { CountryData } from "../../../../data/country-data";
import { useGameStore } from "../../../../store/useGameStore";
import { useMapUiStore } from "../../../../store/useMapUiStore";
import {
  resolveMapCountry,
} from "../../domain/gameRules";
import type { GameCommandInput } from "../../domain/gameProtocol";

interface UseAnswerSelectionProps {
  countries: CountryData[];
  currentCountry: CountryData | undefined;
  gameStatus: "idle" | "playing" | "finished";
  mode: "identify" | "reverse" | "pin";
  pinDirection: "locate" | "identify";
  feedback: "correct" | "wrong" | null;
  applyGameCommand: (
    command: GameCommandInput,
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
  feedback,
  applyGameCommand,
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

        applyGameCommand(
          {
            type: "answer",
            answerCountryCode: countryData?.cca3 ?? null,
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
      setPinLocation,
      applyGameCommand,
      setTempHighlightCode,
    ],
  );

  const handleChoiceSelect = useCallback(
    (countryCode: string, choice: string) => {
      if (feedback || !currentCountry || countryCode.length === 0) return;
      applyGameCommand(
        { type: "answer", answerCountryCode: countryCode },
        choice,
        countryCode,
      );
    },
    [feedback, currentCountry, applyGameCommand],
  );

  return {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
  };
};
