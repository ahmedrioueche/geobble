import * as d3 from "d3";
import type { CountryData } from "../../data/country-data";
import { nameMapping } from "../../data/name-mapping";
import { normalizeCountryName } from "../../utils/name-normalizer";
import type { CountryFeature } from "./useWorldMap";

const resolveMappedName = (name: string) => {
  if (!name) return "";
  if (nameMapping[name]) return nameMapping[name];

  const titleCase = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  if (nameMapping[titleCase]) return nameMapping[titleCase];

  const entry = Object.entries(nameMapping).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return entry ? entry[1] : name;
};

export const buildCountryCodeLookup = (
  features: readonly CountryFeature[],
  countries: CountryData[],
): Record<string, string> => {
  const lookup: Record<string, string> = {};

  for (const feature of features) {
    const id = feature.id?.toString();
    const name = feature.properties?.name || "";
    const normalizedMappedName = normalizeCountryName(
      resolveMappedName(name),
    );
    const country = countries.find(
      (item) =>
        (id &&
          (item.cca3 === id ||
            item.cca2 === id ||
            item.ccn3 === id ||
            parseInt(item.ccn3 || "0", 10).toString() === id)) ||
        (normalizedMappedName &&
          normalizeCountryName(item.name) === normalizedMappedName),
    );

    if (!country) continue;
    if (id) lookup[id] = country.cca3;
    if (name) lookup[name.toLowerCase()] = country.cca3;
  }

  return lookup;
};

export const findPinTargetCoordinates = (
  feature: CountryFeature,
  pathGenerator: d3.GeoPath,
  projection: d3.GeoProjection,
  divisions = 64,
): [number, number] | null => {
  const centroid = d3.geoCentroid(feature);
  if (d3.geoContains(feature, centroid)) {
    return centroid as [number, number];
  }

  const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature);
  const invert = projection.invert;
  if (!invert) return null;

  for (let row = 0; row < divisions; row += 1) {
    for (let column = 0; column < divisions; column += 1) {
      const point = invert([
        x0 + ((column + 0.5) / divisions) * (x1 - x0),
        y0 + ((row + 0.5) / divisions) * (y1 - y0),
      ]);
      if (point && d3.geoContains(feature, point)) {
        return point as [number, number];
      }
    }
  }

  return null;
};
