import type * as d3 from "d3";
import type { Geometry, Polygon } from "geojson";
import type { CountryFeature } from "./useWorldMap";

export const findCountryFeature = (
  features: readonly CountryFeature[],
  idToCodeLookup: Record<string, string>,
  countryCode: string,
): CountryFeature | undefined =>
  features.find((feature) => {
    const id = feature.id?.toString() || "";
    const mappedCode =
      idToCodeLookup[id] ||
      idToCodeLookup[feature.properties?.name?.toLowerCase() || ""];
    return mappedCode === countryCode;
  });

export const getEffectiveGeometry = (
  feature: CountryFeature,
  pathGenerator: d3.GeoPath | null,
): Geometry => {
  if (!pathGenerator || feature.geometry.type !== "MultiPolygon") {
    return feature.geometry;
  }

  const parts: Polygon[] = feature.geometry.coordinates.map((coordinates) => ({
    type: "Polygon",
    coordinates,
  }));
  const partsWithArea = parts
    .map((part) => ({
      geometry: part,
      area: pathGenerator.area({
        type: "Feature",
        geometry: part,
        properties: {},
      }),
    }))
    .sort((a, b) => b.area - a.area);

  const largestArea = partsWithArea[0]?.area;
  if (largestArea === undefined) return feature.geometry;

  const significantParts = partsWithArea.filter(
    (part) => part.area > largestArea * 0.2,
  );
  if (significantParts.length === 1) return significantParts[0].geometry;

  return {
    type: "MultiPolygon",
    coordinates: significantParts.map((part) => part.geometry.coordinates),
  };
};
