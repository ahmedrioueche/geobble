import * as d3 from "d3";
import { useCallback } from "react";
import type { RefObject } from "react";
import type { CountryFeatureCollection, CountryFeature } from "./useWorldMap";
import type { GameMode, PinDirection } from "../../store/useGameStore";
import { getEffectiveGeometry } from "./mapFeatureUtils";
import { useMapZoom } from "./useMapZoom";
import { useMapSonarCamera } from "./useMapSonarCamera";
import { useMissionMapCamera } from "./useMissionMapCamera";

interface MapDimensions {
  width: number;
  height: number;
}

interface UseMapCameraOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  groupRef: RefObject<SVGGElement | null>;
  geoData: CountryFeatureCollection | null;
  pathGenerator: d3.GeoPath | null;
  projection: d3.GeoProjection;
  dimensions: MapDimensions;
  idToCodeLookup: Record<string, string>;
  gameStatus: "idle" | "playing" | "finished";
  mode: GameMode;
  pinDirection: PinDirection;
  revealed: boolean;
  selectedCountryCode?: string | null;
  targetPinCoordinates: [number, number] | null;
  missionId?: string | null;
  sonarKey: number;
}

export const useMapCamera = ({
  svgRef,
  groupRef,
  geoData,
  pathGenerator,
  projection,
  dimensions,
  idToCodeLookup,
  gameStatus,
  mode,
  pinDirection,
  revealed,
  selectedCountryCode,
  targetPinCoordinates,
  missionId,
  sonarKey,
}: UseMapCameraOptions) => {
  const zoomRef = useMapZoom({
    svgRef,
    groupRef,
    dimensions,
    pathGenerator,
  });

  const getFeatureEffectiveGeometry = useCallback(
    (feature: CountryFeature) => getEffectiveGeometry(feature, pathGenerator),
    [pathGenerator],
  );

  useMissionMapCamera({
    svgRef,
    zoomRef,
    geoData,
    pathGenerator,
    projection,
    dimensions,
    idToCodeLookup,
    gameStatus,
    mode,
    pinDirection,
    revealed,
    selectedCountryCode,
    targetPinCoordinates,
    missionId,
    getEffectiveGeometry: getFeatureEffectiveGeometry,
  });

  useMapSonarCamera({
    svgRef,
    zoomRef,
    geoData,
    pathGenerator,
    dimensions,
    idToCodeLookup,
    gameStatus,
    selectedCountryCode,
    sonarKey,
  });

  return { getEffectiveGeometry: getFeatureEffectiveGeometry };
};
