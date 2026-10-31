import * as d3 from "d3";
import { describe, expect, it, vi } from "vitest";
import type { CountryFeature, CountryFeatureCollection } from "./useWorldMap";
import { getSelectedCountrySonarPoint } from "./useMapSonarPoint";

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
const geoData: CountryFeatureCollection = {
  type: "FeatureCollection",
  features: [feature],
};
const path = d3.geoPath();
const getEffectiveGeometry = (item: CountryFeature) => item.geometry;

describe("getSelectedCountrySonarPoint", () => {
  it("does not reveal a target in identify mode before it is revealed", () => {
    expect(
      getSelectedCountrySonarPoint({
        geoData,
        pathGenerator: path,
        idToCodeLookup: { CAN: "CAN" },
        selectedCountryCode: "CAN",
        selectedCountryName: "Canada",
        mode: "identify",
        revealed: false,
        getEffectiveGeometry,
      }),
    ).toBeNull();
  });

  it("shows a country sonar point after reveal", () => {
    const spy = vi.spyOn(path, "area").mockReturnValue(120);
    const point = getSelectedCountrySonarPoint({
      geoData,
      pathGenerator: path,
      idToCodeLookup: { CAN: "CAN" },
      selectedCountryCode: "CAN",
      mode: "identify",
      revealed: true,
      getEffectiveGeometry,
    });

    expect(point).not.toBeNull();
    spy.mockRestore();
  });

  it("allows sonar in reverse mode without a reveal state", () => {
    const spy = vi.spyOn(path, "area").mockReturnValue(120);
    const point = getSelectedCountrySonarPoint({
      geoData,
      pathGenerator: path,
      idToCodeLookup: { CAN: "CAN" },
      selectedCountryCode: "CAN",
      mode: "reverse",
      revealed: false,
      getEffectiveGeometry,
    });

    expect(point).not.toBeNull();
    spy.mockRestore();
  });

  it("returns no point when the selected country cannot be resolved", () => {
    expect(
      getSelectedCountrySonarPoint({
        geoData,
        pathGenerator: path,
        idToCodeLookup: {},
        selectedCountryCode: "CAN",
        mode: "reverse",
        revealed: true,
        getEffectiveGeometry,
      }),
    ).toBeNull();
  });
});
