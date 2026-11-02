import * as d3 from "d3";
import React, { useRef } from "react";
import type { CountryData } from "../../data/country-data";
import type { CountryFeatureCollection } from "./useWorldMap";
import type {
  WorldMapGameState,
  WorldMapGameUiState,
  WorldMapMapUiState,
} from "./worldMapStoreSelectors";
import { WorldMapCanvas } from "./WorldMapCanvas";
import { useMapCamera } from "./useMapCamera";
import { useMapViewport } from "./useMapViewport";
import { useMapCountryData } from "./useMapCountryData";
import { useMapSonarPoint } from "./useMapSonarPoint";
import { getMapMarkerState } from "./mapMarkerState";
import { getCountryClickCoordinates } from "./mapInteraction";

export interface WorldMapViewProps {
  geoData: CountryFeatureCollection | null;
  projection: d3.GeoProjection;
  loading: boolean;
  error: string | null;
  onCountryClick?: (
    name: string,
    code: string,
    coordinates?: [number, number],
  ) => void;
  selectedCountry?: string;
  selectedCountryCode?: string | null;
  selectedCountryName?: string | null;
  countries: CountryData[];
  missionId?: string | null;
  game: WorldMapGameState;
  gameUi: WorldMapGameUiState;
  mapUi: WorldMapMapUiState;
  targetMapAnchor?: [number, number];
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  geoData,
  projection,
  loading,
  error,
  onCountryClick,
  selectedCountry,
  selectedCountryCode,
  selectedCountryName,
  countries,
  missionId,
  game: { gameStatus, mode, pinDirection, pinLocation, revealed },
  gameUi: { feedback, clickedCode, clickedName },
  mapUi: { pulseKey, sonarKey, tempHighlightCode },
  targetMapAnchor,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { containerRef, dimensions, pathGenerator } = useMapViewport({
    geoData,
    projection,
  });

  const { features, idToCodeLookup, targetPinCoordinates, targetCountryCode } =
    useMapCountryData({
      geoData,
      countries,
      mode,
      selectedCountryCode,
      targetMapAnchor,
      pathGenerator,
      projection,
    });
  const effectiveSelectedCountryCode =
    selectedCountryCode ?? targetCountryCode;

  const { getEffectiveGeometry } = useMapCamera({
    svgRef,
    groupRef: gRef,
    geoData,
    pathGenerator,
    projection,
    dimensions,
    idToCodeLookup,
    gameStatus,
    mode,
    pinDirection,
    revealed,
    selectedCountryCode: effectiveSelectedCountryCode,
    targetPinCoordinates:
      mode === "pin" && targetMapAnchor
        ? targetMapAnchor
        : targetPinCoordinates,
    missionId,
    sonarKey,
  });

  const handleCountryClick = React.useCallback(
    (name: string, code: string, event: MouseEvent) => {
      if (onCountryClick) {
        const pointer =
          mode === "pin" && gRef.current
            ? d3.pointer(event, gRef.current)
            : null;
        onCountryClick(
          name,
          code,
          getCountryClickCoordinates(mode, pointer, projection),
        );
      }
    },
    [onCountryClick, mode, projection],
  );

  const sonarPoint = useMapSonarPoint({
    geoData,
    pathGenerator,
    idToCodeLookup,
    selectedCountryCode: effectiveSelectedCountryCode,
    selectedCountryName,
    mode,
    revealed,
    getEffectiveGeometry,
  });

  const { targetPinPoint, guessPinPoint, pinScale } = getMapMarkerState({
    mode,
    gameStatus,
    pinDirection,
    revealed,
    pinLocation,
    targetPinCoordinates:
      mode === "pin" && targetMapAnchor
        ? targetMapAnchor
        : targetPinCoordinates,
    projection,
    mapWidth: dimensions.width,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a1526] mt-20"
    >
      {loading || !pathGenerator ? (
        <div className="flex items-center justify-center h-full text-white/40 font-bold uppercase tracking-tight text-[10px]">
          {error ? error : "Establishing Orbital Link..."}
        </div>
      ) : (
        <WorldMapCanvas
          svgRef={svgRef}
          groupRef={gRef}
          dimensions={dimensions}
          countryLayerProps={{
            features,
            pathGenerator,
            idToCodeLookup,
            selectedCountry,
            selectedCountryCode: effectiveSelectedCountryCode,
            gameStatus,
            mode,
            revealed,
            feedback,
            clickedCode,
            clickedName,
            tempHighlightCode,
            onCountryClick: handleCountryClick,
            getEffectiveGeometry,
          }}
          mapMarkerProps={{
            targetPinPoint,
            guessPinPoint,
            sonarPoint,
            feedback,
            gameStatus,
            pulseKey,
            pinScale,
          }}
        />
      )}
    </div>
  );
};
