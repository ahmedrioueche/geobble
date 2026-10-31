import { describe, expect, it, vi } from "vitest";
import { createRoundControls } from "./roundControls";

const createDependencies = () => ({
  currentCountry: { name: "Canada" },
  mode: "identify" as const,
  clearAdvanceTimer: vi.fn(),
  applyRoundAction: vi.fn(),
  nextQuestion: vi.fn(),
  clearClickedCountry: vi.fn(),
  startNewMission: vi.fn(),
  startGame: vi.fn(),
  triggerPulse: vi.fn(),
});

describe("createRoundControls", () => {
  it("clears preview state, resets mission, and starts the game in order", () => {
    const dependencies = createDependencies();
    const calls: string[] = [];
    dependencies.clearClickedCountry.mockImplementation(() => calls.push("clear"));
    dependencies.startNewMission.mockImplementation(() => calls.push("reset"));
    dependencies.startGame.mockImplementation(() => calls.push("start"));

    createRoundControls(dependencies).start();

    expect(calls).toEqual(["clear", "reset", "start"]);
  });

  it("clears pending advancement before skipping the current target", () => {
    const dependencies = createDependencies();

    createRoundControls(dependencies).skip();

    expect(dependencies.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(dependencies.applyRoundAction).toHaveBeenCalledWith(
      { type: "skip" },
      "Canada",
    );
    expect(dependencies.nextQuestion).not.toHaveBeenCalled();
  });

  it("advances if skip is requested without a current target", () => {
    const dependencies = {
      ...createDependencies(),
      currentCountry: undefined,
    };

    createRoundControls(dependencies).skip();

    expect(dependencies.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(dependencies.nextQuestion).toHaveBeenCalledOnce();
    expect(dependencies.applyRoundAction).not.toHaveBeenCalled();
  });

  it("reveals with identify-only streak loss and triggers the map pulse", () => {
    const identifyDependencies = createDependencies();

    createRoundControls(identifyDependencies).reveal();

    expect(identifyDependencies.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(identifyDependencies.applyRoundAction).toHaveBeenCalledWith(
      { type: "reveal", loseStreak: true },
      "",
    );
    expect(identifyDependencies.triggerPulse).toHaveBeenCalledOnce();

    const pinDependencies = { ...createDependencies(), mode: "pin" as const };
    createRoundControls(pinDependencies).reveal();
    expect(pinDependencies.applyRoundAction).toHaveBeenCalledWith(
      { type: "reveal", loseStreak: false },
      "",
    );
  });
});
