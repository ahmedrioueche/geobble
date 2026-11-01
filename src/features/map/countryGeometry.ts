import * as d3 from "d3";
import type { CountryFeature } from "./useWorldMap";

export interface PreparedCountryGeometry {
  feature: CountryFeature;
  index: number;
  name: string;
  code: string;
  path: string | null;
  area: number;
}

export const prepareCountryGeometry = (
  features: CountryFeature[],
  pathGenerator: d3.GeoPath,
): PreparedCountryGeometry[] =>
  features.map((feature, index) => ({
    feature,
    index,
    name: feature.properties.name,
    code: feature.id?.toString() || "",
    path: pathGenerator(feature),
    area: pathGenerator.area(feature),
  }));
