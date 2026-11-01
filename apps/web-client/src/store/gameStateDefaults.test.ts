import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./gameStateDefaults";

describe("createInitialGameState", () => {
  it("creates fresh defaults while preserving the unlocked stage when provided", () => {
    const first = createInitialGameState(4);
    const second = createInitialGameState(4);

    expect(first.unlockedStage).toBe(4);
    expect(first.session.gameStatus).toBe("idle");
    expect(first.session.id).toBeNull();
    expect(first.session.randomState).toBe(0);
    expect(first.session.playedCountryCodes).toEqual([]);
    expect(first.session.playedCountryCodes).not.toBe(
      second.session.playedCountryCodes,
    );
    expect(first.session.sessionPlayedCodes).not.toBe(
      second.session.sessionPlayedCodes,
    );
    expect(first.session.choices).not.toBe(second.session.choices);
    expect(first.session).not.toHaveProperty("feedback");
    expect(first.session).not.toHaveProperty("clickedName");
    expect(first.session).not.toHaveProperty("streakLost");
  });
});
