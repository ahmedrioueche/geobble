import type * as d3 from "d3";
import type { Geometry } from "geojson";
import type { CountryFeature } from "./useWorldMap";

export const getCountrySonarPoint = (
  feature: CountryFeature,
  pathGenerator: d3.GeoPath,
  getEffectiveGeometry: (feature: CountryFeature) => Geometry,
): [number, number] | null => {
  if (pathGenerator.area(feature) > 150) return null;

  const point = pathGenerator.centroid({
    type: "Feature",
    geometry: getEffectiveGeometry(feature),
    properties: {},
  });
  return point as [number, number];
};
