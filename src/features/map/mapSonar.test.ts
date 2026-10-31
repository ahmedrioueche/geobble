import * as d3 from "d3";
import { describe, expect, it, vi } from "vitest";
import type { CountryFeature } from "./useWorldMap";
import { getCountrySonarPoint } from "./mapSonar";

const feature: CountryFeature = {
  type: "Feature",
  id: "CAN",
  properties: { name: "Canada" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [[-10, 0], [10, 0], [10, 10], [-10, 10], [-10, 0]],
    ],
  },
};

describe("getCountrySonarPoint", () => {
  it("returns an effective-geometry centroid for smaller countries", () => {
    const path = d3.geoPath();
    vi.spyOn(path, "area").mockReturnValue(120);
    const getEffectiveGeometry = vi.fn((item: CountryFeature) => item.geometry);

    const point = getCountrySonarPoint(feature, path, getEffectiveGeometry);

    expect(point).not.toBeNull();
    expect(getEffectiveGeometry).toHaveBeenCalledWith(feature);
  });

  it("does not show sonar for countries above the existing area threshold", () => {
    const path = d3.geoPath();
    vi.spyOn(path, "area").mockReturnValue(151);
    const getEffectiveGeometry = vi.fn((item: CountryFeature) => item.geometry);

    expect(getCountrySonarPoint(feature, path, getEffectiveGeometry)).toBeNull();
    expect(getEffectiveGeometry).not.toHaveBeenCalled();
  });
});
