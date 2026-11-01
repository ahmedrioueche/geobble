import { create } from "zustand";
import type { GameUiState } from "../features/game/domain/gameSession";

interface GameUiStore extends GameUiState {
  setFeedback: (
    feedback: GameUiState["feedback"],
    clickedName?: string | null,
    clickedCode?: string | null,
  ) => void;
  setStreakLost: (value: number | null) => void;
  resetGameUi: () => void;
}

const initialUiState = (): GameUiState => ({
  feedback: null,
  clickedName: null,
  clickedCode: null,
  streakLost: null,
});

export const useGameUiStore = create<GameUiStore>((set) => ({
  ...initialUiState(),
  setFeedback: (feedback, clickedName = null, clickedCode = null) =>
    set({ feedback, clickedName, clickedCode }),
  setStreakLost: (streakLost) => set({ streakLost }),
  resetGameUi: () => set(initialUiState()),
}));
