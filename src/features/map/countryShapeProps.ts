import type { Geometry } from "geojson";
import type * as d3 from "d3";
import type { PreparedCountryGeometry } from "./countryGeometry";
import type { CountryFeature } from "./useWorldMap";

export interface CountryShapeProps {
  geometry: PreparedCountryGeometry;
  pathGenerator: d3.GeoPath;
  fillColor: string;
  isPinMode: boolean;
  isHighlighted: boolean;
  isWrongFeedbackItem: boolean;
  showTitle: boolean;
  showGuide: boolean;
  onCountryClick: (name: string, code: string, event: MouseEvent) => void;
  getEffectiveGeometry: (feature: CountryFeature) => Geometry;
}

export const areCountryShapePropsEqual = (
  previous: CountryShapeProps,
  next: CountryShapeProps,
): boolean =>
  previous.geometry === next.geometry &&
  previous.pathGenerator === next.pathGenerator &&
  previous.fillColor === next.fillColor &&
  previous.isPinMode === next.isPinMode &&
  previous.isHighlighted === next.isHighlighted &&
  previous.isWrongFeedbackItem === next.isWrongFeedbackItem &&
  previous.showTitle === next.showTitle &&
  previous.showGuide === next.showGuide &&
  previous.onCountryClick === next.onCountryClick &&
  previous.getEffectiveGeometry === next.getEffectiveGeometry;
