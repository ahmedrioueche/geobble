import { describe, expect, it } from "vitest";
import { getRemainingSeconds } from "./gameClock";

describe("getRemainingSeconds", () => {
  it("rounds positive time up to the next visible second", () => {
    expect(getRemainingSeconds(5001, 0)).toBe(6);
    expect(getRemainingSeconds(5001, 4001)).toBe(1);
  });

  it("clamps expired deadlines to zero", () => {
    expect(getRemainingSeconds(5000, 5000)).toBe(0);
    expect(getRemainingSeconds(5000, 6000)).toBe(0);
  });
});
