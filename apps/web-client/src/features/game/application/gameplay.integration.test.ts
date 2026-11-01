import { afterEach, describe, expect, it } from "vitest";
import type { CountryData } from "../../../data/country-data";
import { useGameStore } from "../../../store/useGameStore";
import { useGameUiStore } from "../../../store/useGameUiStore";
import { isCorrectAnswer, resolveMapCountry } from "../domain/gameRules";
import { transitionRoundAction } from "../domain/roundTransition";

const canada: CountryData = {
  name: "Canada",
  officialName: "Canada",
  cca2: "CA",
  cca3: "CAN",
  ccn3: "124",
  capital: ["Ottawa"],
  region: "Americas",
  subregion: "North America",
  flag: "🇨🇦",
  population: 40000000,
};

const resetPlayingGame = () => {
  const store = useGameStore.getState();
  store.resetGame();
  useGameStore.getState().setGameStatus("playing");
};

const runRoundAction = (
  action: Parameters<typeof transitionRoundAction>[0],
  clickedName: string,
  clickedCode: string | null = null,
) => {
  const store = useGameStore.getState();
  const ui = useGameUiStore.getState();
  const transition = transitionRoundAction(
    action,
    store.session,
    ui,
    clickedName,
    clickedCode,
  );
  useGameStore.setState((current) => ({
    session: { ...current.session, ...transition.state },
  }));
  useGameUiStore.setState(transition.ui);
  return transition;
};

afterEach(() => {
  useGameStore.getState().resetGame();
});

describe("gameplay round integration", () => {
  it("integrates an Identify map answer with scoring and persisted round state", () => {
    resetPlayingGame();
    useGameStore.getState().setStreak(2);
    const answerCountry = resolveMapCountry("Canada", "CAN", [canada]);

    runRoundAction(
      {
        type: "answer",
        isCorrect: isCorrectAnswer(
          { type: "map", country: answerCountry },
          canada,
          "name",
        ),
      },
      "Canada",
      "CAN",
    );

    const state = useGameStore.getState().session;
    const ui = useGameUiStore.getState();
    expect(state.score).toBe(30);
    expect(state.streak).toBe(3);
    expect(state.totalAttempts).toBe(1);
    expect(state.correctAttempts).toBe(1);
    expect(ui.feedback).toBe("correct");
    expect(ui.clickedName).toBe("Canada");
    expect(ui.clickedCode).toBe("CAN");
  });

  it("integrates a Reverse flag choice with correct-answer scoring", () => {
    resetPlayingGame();
    useGameStore.getState().setMode("reverse");
    useGameStore.getState().setSubMode("flag");

    const isCorrect = isCorrectAnswer(
      { type: "choice", value: canada.cca2 },
      canada,
      "flag",
    );
    runRoundAction({ type: "answer", isCorrect }, canada.cca2);

    const state = useGameStore.getState().session;
    expect(state.score).toBe(10);
    expect(state.streak).toBe(1);
    expect(state.correctAttempts).toBe(1);
    expect(useGameUiStore.getState().feedback).toBe("correct");
  });

  it("integrates a Pin Locate miss, saving the guess and revealing the target", () => {
    resetPlayingGame();
    useGameStore.getState().setMode("pin");
    useGameStore.getState().setPinDirection("locate");
    const guess: [number, number] = [-100, 50];
    useGameStore.getState().setPinLocation(guess);

    const answerCountry = resolveMapCountry("France", "FRA", [canada]);
    runRoundAction(
      {
        type: "answer",
        isCorrect: isCorrectAnswer(
          { type: "map", country: answerCountry },
          canada,
          "name",
        ),
        ignoreIncorrectWhenRevealed: true,
      },
      "France",
      "FRA",
    );

    const state = useGameStore.getState().session;
    const ui = useGameUiStore.getState();
    expect(state.pinLocation).toEqual(guess);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.totalAttempts).toBe(1);
    expect(state.correctAttempts).toBe(0);
    expect(ui.feedback).toBe("wrong");
    expect(state.revealed).toBe(true);
  });
});
