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
  targetMapAnchor?: [number, number];
  pathGenerator: d3.GeoPath | null;
  projection: d3.GeoProjection;
}

export const useMapCountryData = ({
  geoData,
  countries,
  mode,
  selectedCountryCode,
  targetMapAnchor,
  pathGenerator,
  projection,
}: UseMapCountryDataOptions) => {
  const features = geoData?.features;

  const idToCodeLookup = useMemo(() => {
    if (!features || countries.length === 0) return {};
    return buildCountryCodeLookup(features, countries);
  }, [features, countries]);

  const targetCountryCode = useMemo(() => {
    if (
      selectedCountryCode ||
      !targetMapAnchor ||
      !features ||
      (mode !== "reverse" &&
        !(mode === "pin" && targetMapAnchor !== undefined))
    ) {
      return selectedCountryCode ?? null;
    }
    const feature = features.find((countryFeature) =>
      d3.geoContains(countryFeature, targetMapAnchor),
    );
    if (!feature) return null;
    return (
      idToCodeLookup[feature.id] ??
      idToCodeLookup[feature.properties.name.toLowerCase()] ??
      null
    );
  }, [
    selectedCountryCode,
    targetMapAnchor,
    features,
    mode,
    idToCodeLookup,
  ]);

  const targetPinCoordinates = useMemo((): [number, number] | null => {
    if (
      mode !== "pin" ||
      !targetCountryCode ||
      !features ||
      !pathGenerator
    ) {
      return null;
    }

    const feature = findCountryFeature(
      features,
      idToCodeLookup,
      targetCountryCode,
    );
    if (!feature) return null;

    return findPinTargetCoordinates(feature, pathGenerator, projection);
  }, [
    mode,
    targetCountryCode,
    features,
    pathGenerator,
    projection,
    idToCodeLookup,
  ]);

  return {
    features: features ?? null,
    idToCodeLookup,
    targetPinCoordinates,
    targetCountryCode,
  };
};
