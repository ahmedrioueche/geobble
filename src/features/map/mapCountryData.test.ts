import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { CountryData } from "../../data/country-data";
import type { CountryFeature } from "./useWorldMap";
import {
  buildCountryCodeLookup,
  findPinTargetCoordinates,
} from "./mapCountryData";

const canada: CountryData = {
  name: "Canada",
  officialName: "Canada",
  cca2: "CA",
  cca3: "CAN",
  ccn3: "124",
  capital: ["Ottawa"],
  region: "Americas",
  subregion: "North America",
  flag: "🇨🇦",
  population: 40000000,
};

describe("buildCountryCodeLookup", () => {
  it("maps numeric feature identifiers and normalized names to alpha-3 codes", () => {
    const features: CountryFeature[] = [
      {
        type: "Feature",
        id: "124",
        properties: { name: "Canada" },
        geometry: { type: "Polygon", coordinates: [] },
      },
    ];

    expect(buildCountryCodeLookup(features, [canada])).toEqual({
      "124": "CAN",
      canada: "CAN",
    });
  });

  it("resolves aliases and case-insensitive mapped names", () => {
    const feature: CountryFeature = {
      type: "Feature",
      id: "unknown",
      properties: { name: "United States of America" },
      geometry: { type: "Polygon", coordinates: [] },
    };
    const unitedStates = {
      ...canada,
      name: "United States",
      cca2: "US",
      cca3: "USA",
      ccn3: "840",
    };

    expect(buildCountryCodeLookup([feature], [unitedStates])).toEqual({
      unknown: "USA",
      "united states of america": "USA",
    });
  });

  it("returns an empty lookup when there is no corresponding country data", () => {
    expect(buildCountryCodeLookup([], [canada])).toEqual({});
  });
});

describe("findPinTargetCoordinates", () => {
  it("uses the feature's interior centroid as the target location", () => {
    const feature: CountryFeature = {
      type: "Feature",
      id: "test",
      properties: { name: "Test" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        ],
      },
    };
    const projection = d3.geoNaturalEarth1().fitSize([100, 100], feature);
    const coordinates = findPinTargetCoordinates(
      feature,
      d3.geoPath(projection),
      projection,
    );

    expect(coordinates).not.toBeNull();
    expect(d3.geoContains(feature, coordinates!)).toBe(true);
  });
});
