import type { RoundAction } from "./gameRules";

interface CurrentTarget {
  name: string;
}

interface RoundControlDependencies {
  currentCountry: CurrentTarget | undefined;
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
  triggerPulse: () => void;
}

export const createRoundControls = ({
  currentCountry,
  mode,
  clearAdvanceTimer,
  applyRoundAction,
  nextQuestion,
  clearClickedCountry,
  startNewMission,
  startGame,
  triggerPulse,
}: RoundControlDependencies) => ({
  start: () => {
    clearClickedCountry();
    startNewMission();
    startGame();
  },
  skip: () => {
    clearAdvanceTimer();
    if (currentCountry) {
      applyRoundAction({ type: "skip" }, currentCountry.name);
    } else {
      nextQuestion();
    }
  },
  reveal: () => {
    clearAdvanceTimer();
    applyRoundAction({ type: "reveal", loseStreak: mode === "identify" }, "");
    triggerPulse();
  },
});
