import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import { getCountryCamera, getMissionOverviewCamera } from "./countryCamera";

describe("getCountryCamera", () => {
  it("frames a country at the desktop center with the identify scale", () => {
    const bounds: [[number, number], [number, number]] = [
      [400, 300],
      [500, 400],
    ];
    const { transform } = getCountryCamera(
      bounds,
      d3.zoomIdentity,
      { width: 1200, height: 800 },
      "identify",
    );

    expect(transform.k).toBe(4);
    expect(transform.apply([450, 350])).toEqual([600, 400]);
  });

  describe("getMissionOverviewCamera", () => {
    it("returns to the normal overview after a close-up without zooming out further", () => {
      const overview = d3.zoomIdentity
        .translate(600, 400)
        .scale(1.3)
        .translate(-600, -400);

      expect(
        getMissionOverviewCamera(d3.zoomIdentity.scale(6), overview),
      ).toBe(overview);
      expect(getMissionOverviewCamera(overview, overview)).toBeNull();
    });
  });

  it("uses the lower reverse-mode scale", () => {
    const bounds: [[number, number], [number, number]] = [
      [400, 300],
      [500, 400],
    ];
    const { transform } = getCountryCamera(
      bounds,
      d3.zoomIdentity,
      { width: 1200, height: 800 },
      "reverse",
    );

    expect(transform.k).toBe(3.4);
  });

  it("positions the country in the mobile map-safe area", () => {
    const bounds: [[number, number], [number, number]] = [
      [100, 100],
      [200, 200],
    ];
    const { transform } = getCountryCamera(
      bounds,
      d3.zoomIdentity,
      { width: 390, height: 844 },
      "identify",
    );

    expect(transform.apply([150, 150])).toEqual([136.5, 548.6]);
  });

  it("clamps extreme country zoom to the existing minimum and maximum", () => {
    const tinyBounds: [[number, number], [number, number]] = [
      [100, 100],
      [100.01, 100.01],
    ];
    const hugeBounds: [[number, number], [number, number]] = [
      [-1000, -1000],
      [1000, 1000],
    ];

    expect(
      getCountryCamera(
        tinyBounds,
        d3.zoomIdentity,
        { width: 1200, height: 800 },
        "identify",
      ).transform.k,
    ).toBe(25);
    expect(
      getCountryCamera(
        hugeBounds,
        d3.zoomIdentity,
        { width: 1200, height: 800 },
        "identify",
      ).transform.k,
    ).toBe(1);
  });

  it("skips a new transition when the country is already in view at a similar scale", () => {
    const bounds: [[number, number], [number, number]] = [
      [400, 300],
      [500, 400],
    ];
    const expectedTransform = getCountryCamera(
      bounds,
      d3.zoomIdentity,
      { width: 1200, height: 800 },
      "identify",
    ).transform;

    expect(
      getCountryCamera(
        bounds,
        expectedTransform,
        { width: 1200, height: 800 },
        "identify",
      ).isAlreadyFramed,
    ).toBe(true);
  });

  it("does not skip when the country is in view but the current zoom differs too much", () => {
    const bounds: [[number, number], [number, number]] = [
      [400, 300],
      [500, 400],
    ];
    const currentTransform = d3.zoomIdentity
      .translate(600, 400)
      .scale(1)
      .translate(-450, -350);

    expect(
      getCountryCamera(
        bounds,
        currentTransform,
        { width: 1200, height: 800 },
        "identify",
      ).isAlreadyFramed,
    ).toBe(false);
  });
});
