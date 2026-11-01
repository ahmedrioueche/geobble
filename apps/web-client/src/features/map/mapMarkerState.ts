import type * as d3 from "d3";
import type { GameMode, PinDirection } from "../../store/useGameStore";

type MapPoint = [number, number] | null;

interface MapMarkerStateOptions {
  mode: GameMode;
  gameStatus: "idle" | "playing" | "finished";
  pinDirection: PinDirection;
  revealed: boolean;
  pinLocation: [number, number] | null;
  targetPinCoordinates: [number, number] | null;
  projection: d3.GeoProjection;
  mapWidth: number;
}

interface MapMarkerState {
  targetPinPoint: MapPoint;
  guessPinPoint: MapPoint;
  pinScale: number;
}

export const getMapMarkerState = ({
  mode,
  gameStatus,
  pinDirection,
  revealed,
  pinLocation,
  targetPinCoordinates,
  projection,
  mapWidth,
}: MapMarkerStateOptions): MapMarkerState => {
  const isPinGame = mode === "pin" && gameStatus === "playing";
  const showTargetPin =
    isPinGame &&
    (pinDirection === "identify" || (pinDirection === "locate" && revealed));

  return {
    targetPinPoint:
      showTargetPin && targetPinCoordinates
        ? projection(targetPinCoordinates)
        : null,
    guessPinPoint:
      isPinGame && pinDirection === "locate" && pinLocation
        ? projection(pinLocation)
        : null,
    pinScale: mapWidth < 768 ? 0.2 : 0.5,
  };
};
