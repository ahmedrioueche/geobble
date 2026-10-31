import { useMemo } from "react";
import type * as d3 from "d3";
import type { Geometry } from "geojson";
import type { GameMode } from "../../store/useGameStore";
import type { CountryFeature, CountryFeatureCollection } from "./useWorldMap";
import { findCountryFeature } from "./mapFeatureUtils";
import { getCountrySonarPoint } from "./mapSonar";

interface UseMapSonarPointOptions {
  geoData: CountryFeatureCollection | null;
  pathGenerator: d3.GeoPath | null;
  idToCodeLookup: Record<string, string>;
  selectedCountryCode?: string | null;
  selectedCountryName?: string | null;
  mode: GameMode;
  revealed: boolean;
  getEffectiveGeometry: (feature: CountryFeature) => Geometry;
}

type SonarPointOptions = Omit<UseMapSonarPointOptions, "getEffectiveGeometry"> &
  Pick<UseMapSonarPointOptions, "getEffectiveGeometry">;

export const getSelectedCountrySonarPoint = ({
  geoData,
  pathGenerator,
  idToCodeLookup,
  selectedCountryCode,
  selectedCountryName,
  mode,
  revealed,
  getEffectiveGeometry,
}: SonarPointOptions): [number, number] | null => {
  const shouldShowSonar = mode === "reverse" || revealed;

  if (
    !geoData ||
    !pathGenerator ||
    !shouldShowSonar ||
    (!selectedCountryCode && !selectedCountryName)
  ) {
    return null;
  }

  const feature = selectedCountryCode
    ? findCountryFeature(
      geoData.features,
        idToCodeLookup,
        selectedCountryCode,
      )
    : undefined;
  if (!feature) return null;

  return getCountrySonarPoint(feature, pathGenerator, getEffectiveGeometry);
};

export const useMapSonarPoint = (options: UseMapSonarPointOptions) =>
  useMemo(
    () =>
      getSelectedCountrySonarPoint({
        geoData: options.geoData,
        pathGenerator: options.pathGenerator,
        idToCodeLookup: options.idToCodeLookup,
        selectedCountryCode: options.selectedCountryCode,
        selectedCountryName: options.selectedCountryName,
        mode: options.mode,
        revealed: options.revealed,
        getEffectiveGeometry: options.getEffectiveGeometry,
      }),
    [
      options.geoData,
      options.pathGenerator,
      options.idToCodeLookup,
      options.selectedCountryCode,
      options.selectedCountryName,
      options.mode,
      options.revealed,
      options.getEffectiveGeometry,
    ],
  );
