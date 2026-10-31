import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import { getPinIdentifyCamera } from "./pinIdentifyCamera";

describe("getPinIdentifyCamera", () => {
  it("uses the moderate desktop zoom and centers the pin", () => {
    const point: [number, number] = [400, 200];
    const { transform } = getPinIdentifyCamera(
      point,
      d3.zoomIdentity,
      { width: 1200, height: 800 },
    );

    expect(transform.k).toBe(2.4);
    expect(transform.apply(point)).toEqual([600, 400]);
  });

  it("uses a moderate mobile zoom and positions the pin in the map-safe area", () => {
    const point: [number, number] = [300, 180];
    const { transform } = getPinIdentifyCamera(
      point,
      d3.zoomIdentity,
      { width: 390, height: 844 },
    );

    expect(transform.k).toBe(2.2);
    expect(transform.apply(point)).toEqual([136.5, 548.6]);
  });

  it("preserves a closer existing zoom instead of zooming out", () => {
    const point: [number, number] = [100, 50];
    const currentTransform = d3.zoomIdentity.scale(5).translate(-100, -50);
    const { transform } = getPinIdentifyCamera(
      point,
      currentTransform,
      { width: 1200, height: 800 },
    );

    expect(transform.k).toBe(5);
  });

  it("reports when the pin is already centered at a suitable zoom", () => {
    const point: [number, number] = [100, 50];
    const currentTransform = d3.zoomIdentity
      .translate(600, 400)
      .scale(2.4)
      .translate(-point[0], -point[1]);

    expect(
      getPinIdentifyCamera(point, currentTransform, {
        width: 1200,
        height: 800,
      }).isAlreadyFocused,
    ).toBe(true);
  });
});
