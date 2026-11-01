import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTimeoutController,
  executeRoundEffects,
} from "./roundActionExecutor";
import { transitionRoundAction } from "./roundTransition";

const state = {
  score: 30,
  streak: 2,
  maxStreak: 2,
  totalAttempts: 4,
  correctAttempts: 3,
  revealed: false,
};
const ui = {
  feedback: null as "correct" | "wrong" | null,
  clickedName: null as string | null,
  clickedCode: null as string | null,
  streakLost: null as number | null,
};

const createHandlers = () => ({
  playFeedback: vi.fn(),
  clearAdvanceTimer: vi.fn(),
  scheduleAdvance: vi.fn(),
  nextQuestion: vi.fn(),
});

describe("transitionRoundAction", () => {
  it("returns updated state and effects for a correct answer", () => {
    const transition = transitionRoundAction(
      { type: "answer", isCorrect: true },
      state,
      ui,
      "Canada",
      "CAN",
    );

    expect(transition).toEqual({
      kind: "outcome",
      state: {
        ...state,
        score: 60,
        streak: 3,
        maxStreak: 3,
        totalAttempts: 5,
        correctAttempts: 4,
      },
      ui: {
        ...ui,
        feedback: "correct",
        clickedName: "Canada",
        clickedCode: "CAN",
      },
      effects: [
        { type: "play-feedback", feedback: "correct" },
        { type: "clear-advance" },
        { type: "schedule-advance", delayMs: 1200 },
      ],
    });
  });

  it("returns no changes or effects for an ignored answer after reveal", () => {
    const transition = transitionRoundAction(
      {
        type: "answer",
        isCorrect: false,
        ignoreIncorrectWhenRevealed: true,
      },
      { ...state, revealed: true },
      ui,
      "France",
      "FRA",
    );

    expect(transition).toEqual({
      kind: "ignore",
      state: { ...state, revealed: true },
      ui,
      effects: [],
    });
  });

  it("advances immediately after a correct answer to a revealed round", () => {
    const revealedState = { ...state, revealed: true };
    const transition = transitionRoundAction(
      { type: "answer", isCorrect: true },
      revealedState,
      ui,
      "Canada",
      "CAN",
    );

    expect(transition).toEqual({
      kind: "advance",
      state: revealedState,
      ui,
      effects: [{ type: "clear-advance" }, { type: "advance-round" }],
    });
  });

  it("updates reveal state and emits the existing reveal delay", () => {
    const transition = transitionRoundAction(
      { type: "reveal", loseStreak: true },
      state,
      ui,
      "",
    );

    expect(transition.state).toMatchObject({
      totalAttempts: 5,
      correctAttempts: 3,
      streak: 0,
      revealed: true,
    });
    expect(transition.ui.streakLost).toBe(2);
    expect(transition.effects).toEqual([
      { type: "clear-advance" },
      { type: "schedule-advance", delayMs: 2500 },
    ]);
  });

  it("updates skip state and emits the existing skip delay", () => {
    const transition = transitionRoundAction(
      { type: "skip" },
      state,
      ui,
      "Canada",
    );

    expect(transition.state).toMatchObject({
      totalAttempts: 5,
      correctAttempts: 3,
      streak: 0,
      revealed: true,
    });
    expect(transition.ui.streakLost).toBe(2);
    expect(transition.effects).toEqual([
      { type: "clear-advance" },
      { type: "schedule-advance", delayMs: 1500 },
    ]);
  });
});

describe("executeRoundEffects", () => {
  it("executes effects in transition order", () => {
    const handlers = createHandlers();

    executeRoundEffects(
      [
        { type: "play-feedback", feedback: "correct" },
        { type: "clear-advance" },
        { type: "schedule-advance", delayMs: 1200 },
      ],
      handlers,
    );

    expect(handlers.playFeedback).toHaveBeenCalledWith("correct");
    expect(handlers.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(handlers.scheduleAdvance).toHaveBeenCalledWith(1200);
    expect(handlers.nextQuestion).not.toHaveBeenCalled();
  });
});

describe("createTimeoutController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a scheduled callback after its delay", () => {
    vi.useFakeTimers();
    const controller = createTimeoutController();
    const callback = vi.fn();

    controller.schedule(1200, callback);
    vi.advanceTimersByTime(1199);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("replaces or clears pending callbacks", () => {
    vi.useFakeTimers();
    const controller = createTimeoutController();
    const replaced = vi.fn();
    const current = vi.fn();

    controller.schedule(1000, replaced);
    controller.schedule(500, current);
    vi.advanceTimersByTime(500);
    expect(replaced).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();

    const cleared = vi.fn();
    controller.schedule(500, cleared);
    controller.clear();
    vi.advanceTimersByTime(500);
    expect(cleared).not.toHaveBeenCalled();
  });
});
