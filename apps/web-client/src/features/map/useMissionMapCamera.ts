import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { Geometry } from "geojson";
import type { CountryFeatureCollection, CountryFeature } from "./useWorldMap";
import type { GameMode, PinDirection } from "../../store/useGameStore";
import { getPinIdentifyCamera } from "./pinIdentifyCamera";
import { getCountryCamera, getMissionOverviewCamera } from "./countryCamera";
import { findCountryFeature } from "./mapFeatureUtils";
import { getCountrySelectionCamera } from "./countrySelectionCamera";

interface MapDimensions {
  width: number;
  height: number;
}

interface UseMissionMapCameraOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  zoomRef: {
    current: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
  };
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
  getEffectiveGeometry: (feature: CountryFeature) => Geometry;
}

export const useMissionMapCamera = ({
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
  getEffectiveGeometry,
}: UseMissionMapCameraOptions) => {
  const lastMissionIdRef = useRef<string | null>(null);
  const homeTransform = useMemo(() => {
    if (dimensions.width === 0) return d3.zoomIdentity;
    const isMobile = dimensions.width < 768;
    const scale = isMobile ? 1.8 : 1.3;

    return d3.zoomIdentity
      .translate(dimensions.width / 2, dimensions.height / 2)
      .scale(scale)
      .translate(-dimensions.width / 2, -dimensions.height / 2);
  }, [dimensions]);

  useEffect(() => {
    if (
      !geoData ||
      !pathGenerator ||
      !svgRef.current ||
      !zoomRef.current ||
      gameStatus !== "playing" ||
      dimensions.width === 0
    ) {
      return;
    }

    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svgRef.current);
    const missionChanged =
      missionId !== null &&
      missionId !== undefined &&
      lastMissionIdRef.current !== null &&
      lastMissionIdRef.current !== missionId;
    if (missionId) lastMissionIdRef.current = missionId;

    if (missionChanged && !selectedCountryCode) {
      const overviewTransform = getMissionOverviewCamera(
        currentTransform,
        homeTransform,
      );
      if (overviewTransform) {
        svg
          .interrupt()
          .transition()
          .duration(900)
          .ease(d3.easeCubicInOut)
          .call(zoomRef.current.transform, overviewTransform);
      }
      return;
    }

    const isPinLocate = mode === "pin" && pinDirection === "locate";
    const isPinIdentify = mode === "pin" && pinDirection === "identify";

    if ((mode === "identify" || isPinLocate) && !revealed) {
      if (!selectedCountryCode) return;

      const feature = findCountryFeature(
        geoData.features,
        idToCodeLookup,
        selectedCountryCode,
      );
      if (!feature) return;

      const effectiveGeometry = getEffectiveGeometry(feature);
      const bounds = pathGenerator.bounds({
        type: "Feature",
        geometry: effectiveGeometry,
        properties: {},
      });
      const transform = getCountrySelectionCamera(
        bounds,
        currentTransform,
        dimensions,
        homeTransform,
      );
      if (!transform) return;

      svg
        .transition()
        .duration(1400)
        .ease(d3.easeCubicInOut)
        .call(zoomRef.current.transform, transform);
      return;
    }

    if (!selectedCountryCode) return;

    if (isPinIdentify && targetPinCoordinates) {
      const point = projection(targetPinCoordinates);
      if (!point) return;

      const { transform, isAlreadyFocused } = getPinIdentifyCamera(
        point,
        currentTransform,
        dimensions,
      );
      if (isAlreadyFocused) return;

      svg
        .transition()
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .call(zoomRef.current.transform, transform);
      return;
    }

    const feature = findCountryFeature(
      geoData.features,
      idToCodeLookup,
      selectedCountryCode,
    );
    if (!feature) return;

    const effectiveGeometry = getEffectiveGeometry(feature);
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds({
      type: "Feature",
      geometry: effectiveGeometry,
      properties: {},
    });
    const { transform, isAlreadyFramed } = getCountryCamera(
      [[x0, y0], [x1, y1]],
      currentTransform,
      dimensions,
      mode,
    );
    if (isAlreadyFramed) return;

    svg
      .transition()
      .duration(1200)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, transform);
  }, [
    missionId,
    selectedCountryCode,
    pinDirection,
    revealed,
    mode,
    gameStatus,
    geoData,
    pathGenerator,
    dimensions,
    idToCodeLookup,
    homeTransform,
    getEffectiveGeometry,
    targetPinCoordinates,
    projection,
    svgRef,
    zoomRef,
  ]);
};
