import * as d3 from "d3";
import { describe, expect, it, vi } from "vitest";
import { getCountryClickCoordinates } from "./mapInteraction";

describe("getCountryClickCoordinates", () => {
  it("converts map pointer coordinates for pin mode", () => {
    const projection = d3
      .geoEquirectangular()
      .scale(1)
      .translate([0, 0]);
    const pointer: [number, number] = [0.5, -0.5];
    const expected = projection.invert?.(pointer);
    const invert = vi.spyOn(projection, "invert");
    invert.mockClear();

    expect(getCountryClickCoordinates("pin", pointer, projection)).toEqual(expected);
    expect(invert).toHaveBeenCalledOnce();
  });

  it("does not convert pointer coordinates for other game modes", () => {
    const projection = d3.geoEquirectangular();
    const invert = vi.spyOn(projection, "invert");

    expect(
      getCountryClickCoordinates("identify", [10, 20], projection),
    ).toBeUndefined();
    expect(getCountryClickCoordinates("reverse", [10, 20], projection)).toBeUndefined();
    expect(invert).not.toHaveBeenCalled();
  });

  it("returns no coordinates when pin-mode pointer coordinates are unavailable", () => {
    const projection = d3.geoEquirectangular();
    const invert = vi.spyOn(projection, "invert");

    expect(getCountryClickCoordinates("pin", null, projection)).toBeUndefined();
    expect(invert).not.toHaveBeenCalled();
  });
});
