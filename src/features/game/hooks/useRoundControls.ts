import { useMemo } from "react";
import { useMapUiStore } from "../../../store/useMapUiStore";
import type { GameCommandInput } from "../gameProtocol";
import { createRoundControls } from "../roundControls";

interface UseRoundControlsProps {
  currentCountry: { name: string } | undefined;
  clearAdvanceTimer: () => void;
  applyGameCommand: (
    command: GameCommandInput,
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
  clearAdvanceTimer,
  applyGameCommand,
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
        clearAdvanceTimer,
        applyGameCommand,
        nextQuestion,
        clearClickedCountry,
        startNewMission,
        startGame,
        triggerPulse,
      }),
    [
      currentCountry,
      clearAdvanceTimer,
      applyGameCommand,
      nextQuestion,
      clearClickedCountry,
      startNewMission,
      startGame,
      triggerPulse,
    ],
  );
};
