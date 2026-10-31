import { describe, expect, it } from "vitest";
import { getSonarCamera } from "./sonarCamera";

describe("getSonarCamera", () => {
  it("frames the target in the center on desktop with the existing zoom policy", () => {
    const transform = getSonarCamera(
      [[0, 0], [100, 100]],
      { width: 1000, height: 600 },
    );

    expect(transform.k).toBeCloseTo(2.7);
    expect(transform.apply([50, 50])).toEqual([500, 300]);
  });

  it("positions the target in the mobile map focus area", () => {
    const transform = getSonarCamera(
      [[0, 0], [40, 80]],
      { width: 400, height: 800 },
    );

    expect(transform.k).toBeCloseTo(4.5);
    expect(transform.apply([20, 40])).toEqual([140, 520]);
  });

  it("clamps extreme zoom to the existing maximum", () => {
    const transform = getSonarCamera(
      [[0, 0], [1, 1]],
      { width: 1000, height: 600 },
    );

    expect(transform.k).toBe(25);
  });
});
