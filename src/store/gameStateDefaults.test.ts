import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./gameStateDefaults";

describe("createInitialGameState", () => {
  it("creates fresh defaults while preserving the unlocked stage when provided", () => {
    const first = createInitialGameState(4);
    const second = createInitialGameState(4);

    expect(first.unlockedStage).toBe(4);
    expect(first.gameStatus).toBe("idle");
    expect(first.playedCountryCodes).toEqual([]);
    expect(first.playedCountryCodes).not.toBe(second.playedCountryCodes);
    expect(first.sessionPlayedCodes).not.toBe(second.sessionPlayedCodes);
    expect(first.choices).not.toBe(second.choices);
  });
});
