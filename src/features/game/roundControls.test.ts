import { describe, expect, it, vi } from "vitest";
import { createRoundControls } from "./roundControls";

const createDependencies = () => ({
  currentCountry: { name: "Canada" },
  clearAdvanceTimer: vi.fn(),
  applyGameCommand: vi.fn(),
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
    expect(dependencies.applyGameCommand).toHaveBeenCalledWith(
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
    expect(dependencies.applyGameCommand).not.toHaveBeenCalled();
  });

  it("dispatches reveal and triggers the map pulse", () => {
    const identifyDependencies = createDependencies();

    createRoundControls(identifyDependencies).reveal();

    expect(identifyDependencies.clearAdvanceTimer).toHaveBeenCalledOnce();
    expect(identifyDependencies.applyGameCommand).toHaveBeenCalledWith(
      { type: "reveal" },
      "",
    );
    expect(identifyDependencies.triggerPulse).toHaveBeenCalledOnce();
  });
});
