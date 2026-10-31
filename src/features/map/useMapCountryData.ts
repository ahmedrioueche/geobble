import * as d3 from "d3";
import { useMemo } from "react";
import type { CountryFeatureCollection } from "./useWorldMap";
import type { CountryData } from "../../data/country-data";
import {
  buildCountryCodeLookup,
  findPinTargetCoordinates,
} from "./mapCountryData";
import { findCountryFeature } from "./mapFeatureUtils";
import type { GameMode } from "../../store/useGameStore";

interface UseMapCountryDataOptions {
  geoData: CountryFeatureCollection | null;
  countries: CountryData[];
  mode: GameMode;
  selectedCountryCode?: string | null;
  pathGenerator: d3.GeoPath | null;
  projection: d3.GeoProjection;
}

export const useMapCountryData = ({
  geoData,
  countries,
  mode,
  selectedCountryCode,
  pathGenerator,
  projection,
}: UseMapCountryDataOptions) => {
  const features = geoData?.features;

  const idToCodeLookup = useMemo(() => {
    if (!features || countries.length === 0) return {};
    return buildCountryCodeLookup(features, countries);
  }, [features, countries]);

  const targetPinCoordinates = useMemo((): [number, number] | null => {
    if (
      mode !== "pin" ||
      !selectedCountryCode ||
      !features ||
      !pathGenerator
    ) {
      return null;
    }

    const feature = findCountryFeature(
      features,
      idToCodeLookup,
      selectedCountryCode,
    );
    if (!feature) return null;

    return findPinTargetCoordinates(feature, pathGenerator, projection);
  }, [
    mode,
    selectedCountryCode,
    features,
    pathGenerator,
    projection,
    idToCodeLookup,
  ]);

  return { features: features ?? null, idToCodeLookup, targetPinCoordinates };
};
