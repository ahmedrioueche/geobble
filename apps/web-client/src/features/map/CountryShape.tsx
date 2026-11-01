import React from "react";
import type { CountryShapeProps } from "./countryShapeProps";
import { areCountryShapePropsEqual } from "./countryShapeProps";

const SMALL_COUNTRY_THRESHOLD = 150;
const TINY_ISLAND_THRESHOLD = 30;

const CountryShapeView: React.FC<CountryShapeProps> = ({
  geometry,
  pathGenerator,
  fillColor,
  isPinMode,
  isHighlighted,
  isWrongFeedbackItem,
  showTitle,
  showGuide,
  onCountryClick,
  getEffectiveGeometry,
}) => {
  const { feature, name, code, path, area } = geometry;
  const isSmall = area < SMALL_COUNTRY_THRESHOLD;
  const isTiny = area < TINY_ISLAND_THRESHOLD;
  let guideCircle: React.ReactNode = null;

  if (isTiny && showGuide) {
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
    <>
      <path
        d={path || ""}
        style={{
          fill: fillColor,
          fillOpacity: 1,
          stroke: isPinMode ? fillColor : undefined,
          strokeWidth: isPinMode
            ? 1.5
            : isHighlighted
              ? "var(--map-selected-stroke-width)"
              : "var(--map-stroke-width)",
          strokeLinejoin: isPinMode ? "round" : undefined,
          strokeLinecap: isPinMode ? "round" : undefined,
          vectorEffect: isPinMode ? "non-scaling-stroke" : undefined,
        }}
        className={`
          ${isPinMode ? "" : "stroke-white/40"}
          transition-all
          duration-300
          hover:fill-opacity-100
          ${isPinMode ? "" : "hover:stroke-white/90 hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"}
          cursor-pointer
          ${isHighlighted && !isPinMode ? `stroke-${isWrongFeedbackItem ? "[#ef4444]" : "[#22c55e]"} drop-shadow-[0_0_25px_rgba(${isWrongFeedbackItem ? "239,68,68" : "34,197,94"},0.9)] z-50 ${isSmall ? "animate-pulse" : ""}` : ""}
        `}
        onClick={(event) => onCountryClick(name, code, event.nativeEvent)}
      >
        {showTitle && <title>{name}</title>}
      </path>
      {guideCircle}
    </>
  );
};

export const CountryShape = React.memo(
  CountryShapeView,
  areCountryShapePropsEqual,
);
