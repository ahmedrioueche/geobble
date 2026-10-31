import * as d3 from "d3";
import React, { useMemo } from "react";
import type { Geometry } from "geojson";
import type { GameMode } from "../../store/useGameStore";
import type { CountryFeature } from "./useWorldMap";

interface CountryLayerProps {
  features: CountryFeature[] | null;
  pathGenerator: d3.GeoPath | null;
  idToCodeLookup: Record<string, string>;
  selectedCountry?: string;
  selectedCountryCode?: string | null;
  gameStatus: "idle" | "playing" | "finished";
  mode: GameMode;
  revealed: boolean;
  feedback: "correct" | "wrong" | null;
  clickedCode: string | null;
  clickedName: string | null;
  tempHighlightCode: string | null;
  onCountryClick: (name: string, code: string, event: MouseEvent) => void;
  getEffectiveGeometry: (feature: CountryFeature) => Geometry;
}

const SMALL_COUNTRY_THRESHOLD = 150;
const TINY_ISLAND_THRESHOLD = 30;

export const CountryLayer: React.FC<CountryLayerProps> = ({
  features,
  pathGenerator,
  idToCodeLookup,
  selectedCountry,
  selectedCountryCode,
  gameStatus,
  mode,
  revealed,
  feedback,
  clickedCode,
  clickedName,
  tempHighlightCode,
  onCountryClick,
  getEffectiveGeometry,
}) => {
  const mapElements = useMemo(() => {
    if (!features || !pathGenerator) return null;

    return features.map((feature, index) => {
      const { name } = feature.properties;
      const code = feature.id?.toString() || "";
      const path = pathGenerator(feature);
      const mappedCode =
        idToCodeLookup[code] || idToCodeLookup[name.toLowerCase()];
      const shouldShowSelection =
        mode === "reverse" || revealed || (mode === "pin" && feedback !== null);
      const isSelected =
        shouldShowSelection &&
        mappedCode &&
        ((selectedCountryCode && mappedCode === selectedCountryCode) ||
          (selectedCountry &&
            name.toLowerCase() === selectedCountry.toLowerCase()));
      const isFeedbackItem =
        mappedCode &&
        ((clickedCode && idToCodeLookup[clickedCode] === mappedCode) ||
          (clickedName &&
            idToCodeLookup[clickedName.toLowerCase()] === mappedCode));

      let fillColor = "var(--color-map-land)";
      if (isFeedbackItem && feedback) {
        fillColor = feedback === "correct" ? "#22c55e" : "#ef4444";
      } else if (
        isSelected ||
        (tempHighlightCode && mappedCode === tempHighlightCode)
      ) {
        fillColor = "#22c55e";
      }

      const isHighlighted =
        isSelected ||
        (isFeedbackItem && feedback) ||
        (tempHighlightCode && mappedCode === tempHighlightCode);
      const area = pathGenerator.area(feature);
      const isSmall = area < SMALL_COUNTRY_THRESHOLD;
      const isTiny = area < TINY_ISLAND_THRESHOLD;
      const isGuideActive =
        mode !== "pin" &&
        (isSelected || (isFeedbackItem && mode === "reverse"));

      let guideCircle: React.ReactNode = null;
      if (isTiny && isGuideActive) {
        const effectiveGeometry = getEffectiveGeometry(feature);
        const [[x0, y0], [x1, y1]] = pathGenerator.bounds({
          type: "Feature",
          geometry: effectiveGeometry,
          properties: {},
        });
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const radius = Math.max((x1 - x0) / 2, (y1 - y0) / 2) + 4;

        guideCircle = (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            className="pointer-events-none animate-[pulse_2s_infinite] drop-shadow-[0_0_5px_white]"
            style={{ vectorEffect: "non-scaling-stroke" }}
          />
        );
      }

      return (
        <React.Fragment key={`${name}-${index}`}>
          <path
            d={path || ""}
            style={{
              fill: fillColor,
              fillOpacity: 1,
              stroke: mode === "pin" ? fillColor : undefined,
              strokeWidth:
                mode === "pin"
                  ? 1.5
                  : isHighlighted
                    ? "var(--map-selected-stroke-width)"
                    : "var(--map-stroke-width)",
              strokeLinejoin: mode === "pin" ? "round" : undefined,
              strokeLinecap: mode === "pin" ? "round" : undefined,
              vectorEffect: mode === "pin" ? "non-scaling-stroke" : undefined,
            }}
            className={`
              ${mode === "pin" ? "" : "stroke-white/40"}
              transition-all 
              duration-300 
              hover:fill-opacity-100
              ${mode === "pin" ? "" : "hover:stroke-white/90 hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"}
              cursor-pointer
              ${isHighlighted && mode !== "pin" ? `stroke-${isFeedbackItem && feedback === "wrong" ? "[#ef4444]" : "[#22c55e]"} drop-shadow-[0_0_25px_rgba(${isFeedbackItem && feedback === "wrong" ? "239,68,68" : "34,197,94"},0.9)] z-50 ${isSmall ? "animate-pulse" : ""}` : ""}
            `}
            onClick={(event) => onCountryClick(name, code, event.nativeEvent)}
          >
            {gameStatus !== "playing" && <title>{name}</title>}
          </path>
          {guideCircle}
        </React.Fragment>
      );
    });
  }, [
    features,
    pathGenerator,
    idToCodeLookup,
    selectedCountry,
    selectedCountryCode,
    gameStatus,
    mode,
    revealed,
    feedback,
    clickedCode,
    clickedName,
    tempHighlightCode,
    onCountryClick,
    getEffectiveGeometry,
  ]);

  return <>{mapElements}</>;
};
