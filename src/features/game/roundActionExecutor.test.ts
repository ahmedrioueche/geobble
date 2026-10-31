import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeoutController, executeRoundAction } from "./roundActionExecutor";

const state = { score: 30, streak: 2, revealed: false };

const createEffects = () => ({
  recordAttempt: vi.fn(),
  playFeedback: vi.fn(),
  setFeedback: vi.fn(),
  setScore: vi.fn(),
  setStreak: vi.fn(),
  setStreakLost: vi.fn(),
  setRevealed: vi.fn(),
  clearAdvanceTimer: vi.fn(),
  scheduleAdvance: vi.fn(),
  nextQuestion: vi.fn(),
});

describe("executeRoundAction", () => {
  it("applies answer effects and schedules its established delay", () => {
    const effects = createEffects();

    const transition = executeRoundAction(
      { type: "answer", isCorrect: true },
      state,
      "Canada",
      "CAN",
      effects,
    );

    expect(transition.advanceDelayMs).toBe(1200);
    expect(effects.recordAttempt).toHaveBeenCalledWith(true);
    expect(effects.playFeedback).toHaveBeenCalledWith("correct");
    expect(effects.setFeedback).toHaveBeenCalledWith("correct", "Canada", "CAN");
    expect(effects.setScore).toHaveBeenCalledWith(60);
    expect(effects.setStreak).toHaveBeenCalledWith(3);
    expect(effects.setRevealed).toHaveBeenCalledWith(false);
    expect(effects.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(effects.scheduleAdvance).toHaveBeenCalledWith(1200);
    expect(effects.nextQuestion).not.toHaveBeenCalled();
  });

  it("does not commit or record an ignored answer after reveal", () => {
    const effects = createEffects();

    executeRoundAction(
      {
        type: "answer",
        isCorrect: false,
        ignoreIncorrectWhenRevealed: true,
      },
      { ...state, revealed: true },
      "France",
      "FRA",
      effects,
    );

    expect(effects.recordAttempt).not.toHaveBeenCalled();
    expect(effects.setFeedback).not.toHaveBeenCalled();
    expect(effects.scheduleAdvance).not.toHaveBeenCalled();
  });

  it("clears a pending advance and immediately advances on a correct revealed answer", () => {
    const effects = createEffects();

    executeRoundAction(
      { type: "answer", isCorrect: true },
      { ...state, revealed: true },
      "Canada",
      "CAN",
      effects,
    );

    expect(effects.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(effects.nextQuestion).toHaveBeenCalledOnce();
    expect(effects.recordAttempt).not.toHaveBeenCalled();
  });

  it("schedules reveal and skip delays without answer feedback", () => {
    const revealEffects = createEffects();
    executeRoundAction(
      { type: "reveal", loseStreak: true },
      state,
      "",
      null,
      revealEffects,
    );
    expect(revealEffects.scheduleAdvance).toHaveBeenCalledWith(2500);
    expect(revealEffects.playFeedback).not.toHaveBeenCalled();

    const skipEffects = createEffects();
    executeRoundAction({ type: "skip" }, state, "Canada", null, skipEffects);
    expect(skipEffects.scheduleAdvance).toHaveBeenCalledWith(1500);
    expect(skipEffects.recordAttempt).toHaveBeenCalledWith(false);
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
