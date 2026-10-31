import { afterEach, describe, expect, it, vi } from "vitest";
import type { CountryData } from "../../data/country-data";
import { useGameStore } from "../../store/useGameStore";
import { executeRoundAction } from "./roundActionExecutor";
import { isCorrectAnswer, resolveMapCountry } from "./gameRules";

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
  action: Parameters<typeof executeRoundAction>[0],
  clickedName: string,
  clickedCode: string | null = null,
) => {
  const store = useGameStore.getState();
  return executeRoundAction(
    action,
    {
      score: store.score,
      streak: store.streak,
      revealed: store.revealed,
    },
    clickedName,
    clickedCode,
    {
      recordAttempt: (correct) =>
        useGameStore.getState().recordAttempt(correct),
      playFeedback: vi.fn(),
      setFeedback: (feedback, name, code) =>
        useGameStore.getState().setFeedback(feedback, name, code),
      setScore: (score) => useGameStore.getState().setScore(score),
      setStreak: (streak) => useGameStore.getState().setStreak(streak),
      setStreakLost: (value) => useGameStore.getState().setStreakLost(value),
      setRevealed: (revealed) =>
        useGameStore.getState().setRevealed(revealed),
      clearAdvanceTimer: vi.fn(),
      scheduleAdvance: vi.fn(),
      nextQuestion: vi.fn(),
    },
  );
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

    const state = useGameStore.getState();
    expect(state.score).toBe(30);
    expect(state.streak).toBe(3);
    expect(state.totalAttempts).toBe(1);
    expect(state.correctAttempts).toBe(1);
    expect(state.feedback).toBe("correct");
    expect(state.clickedName).toBe("Canada");
    expect(state.clickedCode).toBe("CAN");
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

    const state = useGameStore.getState();
    expect(state.score).toBe(10);
    expect(state.streak).toBe(1);
    expect(state.correctAttempts).toBe(1);
    expect(state.feedback).toBe("correct");
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

    const state = useGameStore.getState();
    expect(state.pinLocation).toEqual(guess);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.totalAttempts).toBe(1);
    expect(state.correctAttempts).toBe(0);
    expect(state.feedback).toBe("wrong");
    expect(state.revealed).toBe(true);
  });
});
