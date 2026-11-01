import React from "react";
import type { RefObject } from "react";
import { CountryLayer } from "./CountryLayer";
import { MapMarkers } from "./MapMarkers";

interface MapDimensions {
  width: number;
  height: number;
}

interface WorldMapCanvasProps {
  svgRef: RefObject<SVGSVGElement | null>;
  groupRef: RefObject<SVGGElement | null>;
  dimensions: MapDimensions;
  countryLayerProps: React.ComponentProps<typeof CountryLayer>;
  mapMarkerProps: React.ComponentProps<typeof MapMarkers>;
}

export const WorldMapCanvas: React.FC<WorldMapCanvasProps> = ({
  svgRef,
  groupRef,
  dimensions,
  countryLayerProps,
  mapMarkerProps,
}) => (
  <>
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      className="w-full h-full select-none cursor-move"
    >
      <g ref={groupRef} className="map-features">
        <CountryLayer {...countryLayerProps} />
        <MapMarkers {...mapMarkerProps} />
      </g>
    </svg>

    <div className="absolute bottom-6 left-6 pointer-events-none hidden md:block">
      <span className="text-[10px] font-bold text-white/20 uppercase tracking-tight bg-slate-900/60 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5 shadow-2xl">
        Drag to Pan • Scroll to Zoom
      </span>
    </div>
  </>
);
