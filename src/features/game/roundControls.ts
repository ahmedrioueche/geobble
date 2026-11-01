import type { GameCommandInput } from "./gameProtocol";

interface CurrentTarget {
  name: string;
}

interface RoundControlDependencies {
  currentCountry: CurrentTarget | undefined;
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
  triggerPulse: () => void;
}

export const createRoundControls = ({
  currentCountry,
  clearAdvanceTimer,
  applyGameCommand,
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
      applyGameCommand({ type: "skip" }, currentCountry.name);
    } else {
      nextQuestion();
    }
  },
  reveal: () => {
    clearAdvanceTimer();
    applyGameCommand({ type: "reveal" }, "");
    triggerPulse();
  },
});
