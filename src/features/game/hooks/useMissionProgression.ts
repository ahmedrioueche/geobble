import { useCallback } from "react";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useGameUiStore } from "../../../store/useGameUiStore";
import { advanceMission, startMission } from "../gameEngine";

interface UseMissionProgressionProps {
  countries: CountryData[];
  finishGame: () => void;
}

export const useMissionProgression = ({
  countries,
  finishGame,
}: UseMissionProgressionProps) => {
  const nextQuestion = useCallback(() => {
    const state = useGameStore.getState();
    const transition = advanceMission(
      state.session,
      countries,
      state.unlockedStage,
    );
    if (transition.type === "finished") {
      finishGame();
      return;
    }
    if (transition.type === "ignored") return;

    useGameStore.setState({ session: transition.session });
    useGameUiStore.getState().setFeedback(null);
  }, [countries, finishGame]);

  const startGame = useCallback(() => {
    const state = useGameStore.getState();
    const transition = startMission(
      state.session,
      countries,
      state.unlockedStage,
    );
    useGameStore.setState({ session: transition.session });
    useGameUiStore.getState().setFeedback(null);
    if (transition.type === "finished") finishGame();
  }, [countries, finishGame]);

  return { startGame, nextQuestion };
};
