import * as d3 from "d3";
import React, { useMemo } from "react";
import type { Geometry } from "geojson";
import type { GameMode } from "../../store/useGameStore";
import type { CountryFeature } from "./useWorldMap";
import { prepareCountryGeometry } from "./countryGeometry";
import { CountryShape } from "./CountryShape";

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
  const preparedGeometry = useMemo(
    () =>
      features && pathGenerator
        ? prepareCountryGeometry(features, pathGenerator)
        : null,
    [features, pathGenerator],
  );

  const mapElements = useMemo(() => {
    if (!preparedGeometry || !pathGenerator) return null;

    return preparedGeometry.map((geometry) => {
      const { index, name, code } = geometry;
      const mappedCode =
        idToCodeLookup[code] || idToCodeLookup[name.toLowerCase()];
      const shouldShowSelection =
        mode === "reverse" || revealed || (mode === "pin" && feedback !== null);
      const isSelected = Boolean(
        shouldShowSelection &&
          mappedCode &&
          ((selectedCountryCode && mappedCode === selectedCountryCode) ||
            (selectedCountry &&
              name.toLowerCase() === selectedCountry.toLowerCase())),
      );
      const isFeedbackItem = Boolean(
        mappedCode &&
          ((clickedCode && idToCodeLookup[clickedCode] === mappedCode) ||
            (clickedName &&
              idToCodeLookup[clickedName.toLowerCase()] === mappedCode)),
      );
      const isHighlighted = Boolean(
        isSelected ||
          (isFeedbackItem && feedback) ||
          (tempHighlightCode && mappedCode === tempHighlightCode),
      );
      const fillColor =
        isFeedbackItem && feedback
          ? feedback === "correct"
            ? "#22c55e"
            : "#ef4444"
          : isSelected || (tempHighlightCode && mappedCode === tempHighlightCode)
            ? "#22c55e"
            : "var(--color-map-land)";

      return (
        <CountryShape
          key={`${name}-${index}`}
          geometry={geometry}
          pathGenerator={pathGenerator}
          fillColor={fillColor}
          isPinMode={mode === "pin"}
          isHighlighted={isHighlighted}
          isWrongFeedbackItem={Boolean(isFeedbackItem && feedback === "wrong")}
          showTitle={gameStatus !== "playing"}
          showGuide={
            mode !== "pin" &&
            (isSelected || (isFeedbackItem && mode === "reverse"))
          }
          onCountryClick={onCountryClick}
          getEffectiveGeometry={getEffectiveGeometry}
        />
      );
    });
  }, [
    preparedGeometry,
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
