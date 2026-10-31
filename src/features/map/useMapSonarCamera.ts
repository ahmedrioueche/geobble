import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CountryFeatureCollection } from "./useWorldMap";
import {
  findCountryFeature,
  getEffectiveGeometry,
} from "./mapFeatureUtils";
import { getSonarCamera } from "./sonarCamera";

interface MapDimensions {
  width: number;
  height: number;
}

interface UseMapSonarCameraOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  zoomRef: {
    current: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
  };
  geoData: CountryFeatureCollection | null;
  pathGenerator: d3.GeoPath | null;
  dimensions: MapDimensions;
  idToCodeLookup: Record<string, string>;
  gameStatus: "idle" | "playing" | "finished";
  selectedCountryCode?: string | null;
  sonarKey: number;
}

export const useMapSonarCamera = ({
  svgRef,
  zoomRef,
  geoData,
  pathGenerator,
  dimensions,
  idToCodeLookup,
  gameStatus,
  selectedCountryCode,
  sonarKey,
}: UseMapSonarCameraOptions) => {
  const lastSonarKeyRef = useRef(0);

  useEffect(() => {
    if (sonarKey === 0) {
      lastSonarKeyRef.current = 0;
      return;
    }

    if (sonarKey === lastSonarKeyRef.current) return;
    lastSonarKeyRef.current = sonarKey;

    if (
      !geoData ||
      !pathGenerator ||
      !svgRef.current ||
      !zoomRef.current ||
      gameStatus !== "playing" ||
      !selectedCountryCode ||
      dimensions.width === 0
    ) {
      return;
    }

    const feature = findCountryFeature(
      geoData.features,
      idToCodeLookup,
      selectedCountryCode,
    );
    if (!feature) return;

    const effectiveGeometry = getEffectiveGeometry(feature, pathGenerator);
    const bounds = pathGenerator.bounds({
      type: "Feature",
      geometry: effectiveGeometry,
      properties: {},
    });
    const transform = getSonarCamera(bounds, dimensions);

    d3.select(svgRef.current)
      .transition()
      .duration(900)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, transform);
  }, [
    sonarKey,
    geoData,
    pathGenerator,
    gameStatus,
    selectedCountryCode,
    dimensions,
    idToCodeLookup,
    svgRef,
    zoomRef,
  ]);
};
