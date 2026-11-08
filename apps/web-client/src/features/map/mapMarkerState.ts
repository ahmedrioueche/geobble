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
  feedback?: "correct" | "wrong" | null;
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
  feedback = null,
}: MapMarkerStateOptions): MapMarkerState => {
  const isPinGame =
    mode === "pin" && (gameStatus === "playing" || revealed);
  const guessPinPoint =
    isPinGame && pinDirection === "locate" && pinLocation
      ? projection(pinLocation)
      : null;
  // A correct locate guess already marks the answer; a second target pin
  // would only stack a duplicate on top of it.
  const guessMarksTarget =
    pinDirection === "locate" && feedback === "correct" && guessPinPoint !== null;
  const showTargetPin =
    isPinGame &&
    (pinDirection === "identify" ||
      (pinDirection === "locate" && revealed && !guessMarksTarget));

  return {
    targetPinPoint:
      showTargetPin && targetPinCoordinates
        ? projection(targetPinCoordinates)
        : null,
    guessPinPoint,
    pinScale: mapWidth < 768 ? 0.08 : 0.5,
  };
};
