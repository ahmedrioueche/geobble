import * as d3 from "d3";
import React, { useRef } from "react";
import type { CountryData } from "../../data/country-data";
import { useGameStore } from "../../store/useGameStore";
import { useGameUiStore } from "../../store/useGameUiStore";
import { useMapUiStore } from "../../store/useMapUiStore";
import { useMapCamera } from "./useMapCamera";
import { MapMarkers } from "./MapMarkers";
import { useWorldMap } from "./useWorldMap";
import { CountryLayer } from "./CountryLayer";
import { useMapViewport } from "./useMapViewport";
import { useMapCountryData } from "./useMapCountryData";
import { useMapSonarPoint } from "./useMapSonarPoint";
import { getMapMarkerState } from "./mapMarkerState";
import { useShallow } from "zustand/react/shallow";
import {
  selectWorldMapSession,
  selectWorldMapUi,
} from "./worldMapStoreSelectors";

interface MapProps {
  onCountryClick?: (name: string, code: string, coordinates?: [number, number]) => void;
  selectedCountry?: string;
  selectedCountryCode?: string | null;
  selectedCountryName?: string | null;
  countries?: CountryData[];
  missionId?: string | null;
}

export const WorldMap: React.FC<MapProps> = ({
  onCountryClick,
  selectedCountry,
  selectedCountryCode,
  selectedCountryName,
  missionId,
  countries = [],
}) => {
  const { geoData, loading, error, projection } = useWorldMap();
  const { gameStatus, mode, pinDirection, pinLocation, revealed } =
    useGameStore(useShallow(selectWorldMapSession));
  const { feedback, clickedCode, clickedName } = useGameUiStore(
    useShallow(selectWorldMapUi),
  );
  const { pulseKey, sonarKey, tempHighlightCode } = useMapUiStore(
    useShallow((state) => ({
      pulseKey: state.pulseKey,
      sonarKey: state.sonarKey,
      tempHighlightCode: state.tempHighlightCode,
    })),
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { containerRef, dimensions, pathGenerator } = useMapViewport({
    geoData,
    projection,
  });

  const { features, idToCodeLookup, targetPinCoordinates } =
    useMapCountryData({
      geoData,
      countries,
      mode,
      selectedCountryCode,
      pathGenerator,
      projection,
    });

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
    selectedCountryCode,
    targetPinCoordinates,
    missionId,
    sonarKey,
  });

  const handleCountryClick = React.useCallback(
    (name: string, code: string, event: MouseEvent) => {
      if (onCountryClick) {
        const invert = projection.invert;
        const point =
          mode === "pin" && gRef.current && invert
            ? (invert(d3.pointer(event, gRef.current)) as
                | [number, number]
                | null)
            : null;
        onCountryClick(name, code, point || undefined);
      }
    },
    [onCountryClick, mode, projection],
  );

  const sonarPoint = useMapSonarPoint({
    geoData,
    pathGenerator,
    idToCodeLookup,
    selectedCountryCode,
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
    targetPinCoordinates,
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
        <>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full select-none cursor-move"
          >
            <g ref={gRef} className="map-features">
              <CountryLayer
                features={
                  features
                }
                pathGenerator={pathGenerator}
                idToCodeLookup={idToCodeLookup}
                selectedCountry={selectedCountry}
                selectedCountryCode={selectedCountryCode}
                gameStatus={gameStatus}
                mode={mode}
                revealed={revealed}
                feedback={feedback}
                clickedCode={clickedCode}
                clickedName={clickedName}
                tempHighlightCode={tempHighlightCode}
                onCountryClick={handleCountryClick}
                getEffectiveGeometry={getEffectiveGeometry}
              />
              <MapMarkers
                targetPinPoint={targetPinPoint}
                guessPinPoint={guessPinPoint}
                sonarPoint={sonarPoint}
                feedback={feedback}
                gameStatus={gameStatus}
                pulseKey={pulseKey}
                pinScale={pinScale}
              />
            </g>
          </svg>

          {/* Zoom Instructions Overlay */}
          <div className="absolute bottom-6 left-6 pointer-events-none hidden md:block">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-tight bg-slate-900/60 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5 shadow-2xl">
              Drag to Pan • Scroll to Zoom
            </span>
          </div>
        </>
      )}
    </div>
  );
};
