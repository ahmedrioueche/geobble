import { useMemo } from "react";
import { useMapUiStore } from "../../../store/useMapUiStore";
import type { RoundAction } from "../gameRules";
import { createRoundControls } from "../roundControls";

interface UseRoundControlsProps {
  currentCountry: { name: string } | undefined;
  mode: "identify" | "reverse" | "pin";
  clearAdvanceTimer: () => void;
  applyRoundAction: (
    action: RoundAction,
    clickedName: string,
    clickedCode?: string | null,
  ) => void;
  nextQuestion: () => void;
  clearClickedCountry: () => void;
  startNewMission: () => void;
  startGame: () => void;
}

export const useRoundControls = ({
  currentCountry,
  mode,
  clearAdvanceTimer,
  applyRoundAction,
  nextQuestion,
  clearClickedCountry,
  startNewMission,
  startGame,
}: UseRoundControlsProps) => {
  const triggerPulse = useMapUiStore((state) => state.triggerPulse);

  return useMemo(
    () =>
      createRoundControls({
        currentCountry,
        mode,
        clearAdvanceTimer,
        applyRoundAction,
        nextQuestion,
        clearClickedCountry,
        startNewMission,
        startGame,
        triggerPulse,
      }),
    [
      currentCountry,
      mode,
      clearAdvanceTimer,
      applyRoundAction,
      nextQuestion,
      clearClickedCountry,
      startNewMission,
      startGame,
      triggerPulse,
    ],
  );
};
