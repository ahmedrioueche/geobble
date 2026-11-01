import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { CountryFeature, CountryFeatureCollection } from "./useWorldMap";

type WorldTopology = Topology<{
  countries: GeometryCollection<{ name?: string }>;
}>;

export interface WorldMapData {
  geoData: CountryFeatureCollection;
  availableMapIds: ReadonlySet<string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isGeometryCollection = (
  value: unknown,
): value is GeometryCollection<{ name?: string }> =>
  isRecord(value) &&
  value.type === "GeometryCollection" &&
  Array.isArray(value.geometries) &&
  value.geometries.every(
    (geometry) =>
      isRecord(geometry) &&
      typeof geometry.type === "string" &&
      isRecord(geometry.properties) &&
      typeof geometry.properties.name === "string" &&
      (typeof geometry.id === "string" || typeof geometry.id === "number"),
  );

export const parseWorldMapTopology = (value: unknown): WorldMapData => {
  if (
    !isRecord(value) ||
    value.type !== "Topology" ||
    !isRecord(value.objects) ||
    !isGeometryCollection(value.objects.countries) ||
    !Array.isArray(value.arcs)
  ) {
    throw new Error("Invalid world map topology");
  }

  const topology = value as unknown as WorldTopology;
  const geoData = feature(
    topology,
    topology.objects.countries,
  ) as FeatureCollection<Geometry, { name?: string }>;
  const features: CountryFeature[] = geoData.features.map((country) => {
    if (
      (typeof country.id !== "string" && typeof country.id !== "number") ||
      typeof country.properties?.name !== "string"
    ) {
      throw new Error("World map country is missing its ID or name");
    }

    return {
      ...country,
      id: country.id.toString(),
      properties: { name: country.properties.name },
    };
  });

  return {
    geoData: { ...geoData, features },
    availableMapIds: new Set(
      topology.objects.countries.geometries
        .map((country) => country.id?.toString())
        .filter((id): id is string => id !== undefined),
    ),
  };
};

let cachedWorldMapData: Promise<WorldMapData> | null = null;

export const loadWorldMapData = (): Promise<WorldMapData> => {
  if (cachedWorldMapData) return cachedWorldMapData;

  const loading = fetch("/data/world.json")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load map data");
      return response.json() as Promise<unknown>;
    })
    .then(parseWorldMapTopology);

  cachedWorldMapData = loading;
  void loading.catch(() => {
    if (cachedWorldMapData === loading) cachedWorldMapData = null;
  });
  return loading;
};

export const resetWorldMapDataCache = (): void => {
  cachedWorldMapData = null;
};
