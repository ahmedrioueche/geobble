import type * as d3 from "d3";
import type { GameMode } from "../../store/gameSession";

export const getCountryClickCoordinates = (
  mode: GameMode,
  pointer: [number, number] | null,
  projection: d3.GeoProjection,
): [number, number] | undefined => {
  if (mode !== "pin" || !pointer || !projection.invert) return undefined;
  return projection.invert(pointer) ?? undefined;
};
