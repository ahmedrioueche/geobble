import * as d3 from "d3";
import { describe, expect, it, vi } from "vitest";
import type { CountryFeature } from "./useWorldMap";
import { findCountryFeature, getEffectiveGeometry } from "./mapFeatureUtils";

const canada: CountryFeature = {
  type: "Feature",
  id: "124",
  properties: { name: "Canada" },
  geometry: { type: "Polygon", coordinates: [] },
};

describe("findCountryFeature", () => {
  it("finds features by mapped feature id or mapped name", () => {
    const france: CountryFeature = {
      ...canada,
      id: "France-id",
      properties: { name: "France" },
    };

    expect(
      findCountryFeature(
        [canada, france],
        { "124": "CAN", "france": "FRA" },
        "FRA",
      ),
    ).toBe(france);
  });

  it("returns undefined when no feature maps to the requested country", () => {
    expect(findCountryFeature([canada], { "124": "CAN" }, "FRA")).toBeUndefined();
  });
});

describe("getEffectiveGeometry", () => {
  it("keeps all material islands and omits tiny islands", () => {
    const feature: CountryFeature = {
      ...canada,
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
          [[[20, 0], [24, 0], [24, 4], [20, 4], [20, 0]]],
          [[[30, 0], [31, 0], [31, 1], [30, 1], [30, 0]]],
        ],
      },
    };
    const path = d3.geoPath();
    vi.spyOn(path, "area")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(30)
      .mockReturnValueOnce(1);

    const geometry = getEffectiveGeometry(feature, path);

    expect(geometry.type).toBe("MultiPolygon");
    if (geometry.type === "MultiPolygon") {
      expect(geometry.coordinates).toHaveLength(2);
    }
  });

  it("returns the source geometry when geometry is not multi-polygon or no path is available", () => {
    expect(getEffectiveGeometry(canada, null)).toBe(canada.geometry);

    const multiPolygon: CountryFeature = {
      ...canada,
      geometry: { type: "MultiPolygon", coordinates: [] },
    };
    expect(getEffectiveGeometry(multiPolygon, null)).toBe(multiPolygon.geometry);
  });
});
