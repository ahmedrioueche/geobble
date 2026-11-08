import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import { getMapMarkerState } from "./mapMarkerState";

const projection = d3.geoNaturalEarth1();
const targetPinCoordinates: [number, number] = [10, 20];
const pinLocation: [number, number] = [30, 40];
const defaults = {
  mode: "pin" as const,
  gameStatus: "playing" as const,
  pinDirection: "locate" as const,
  revealed: false,
  pinLocation,
  targetPinCoordinates,
  projection,
  mapWidth: 1200,
};

describe("getMapMarkerState", () => {
  it("only shows a locate target after reveal while preserving the guess pin", () => {
    const hiddenTarget = getMapMarkerState(defaults);
    expect(hiddenTarget.targetPinPoint).toBeNull();
    expect(hiddenTarget.guessPinPoint).toEqual(projection(pinLocation));

    const revealedTarget = getMapMarkerState({ ...defaults, revealed: true });
    expect(revealedTarget.targetPinPoint).toEqual(
      projection(targetPinCoordinates),
    );
  });

  it("does not stack a target pin on a correct locate guess", () => {
    const correct = getMapMarkerState({
      ...defaults,
      revealed: true,
      feedback: "correct",
    });
    expect(correct.targetPinPoint).toBeNull();
    expect(correct.guessPinPoint).toEqual(projection(pinLocation));

    const wrong = getMapMarkerState({
      ...defaults,
      revealed: true,
      feedback: "wrong",
    });
    expect(wrong.targetPinPoint).toEqual(projection(targetPinCoordinates));

    const noGuess = getMapMarkerState({
      ...defaults,
      revealed: true,
      feedback: "correct",
      pinLocation: null,
    });
    expect(noGuess.targetPinPoint).toEqual(projection(targetPinCoordinates));
  });

  it("shows the identify target but not a guess pin", () => {
    const state = getMapMarkerState({
      ...defaults,
      pinDirection: "identify",
    });

    expect(state.targetPinPoint).toEqual(projection(targetPinCoordinates));
    expect(state.guessPinPoint).toBeNull();
  });

  it("hides pins when the map is not in an active pin game", () => {
    expect(
      getMapMarkerState({ ...defaults, mode: "identify" }).targetPinPoint,
    ).toBeNull();
    expect(
      getMapMarkerState({ ...defaults, gameStatus: "finished" }).guessPinPoint,
    ).toBeNull();
  });

  it("uses a smaller pin on mobile and the existing desktop scale", () => {
    expect(getMapMarkerState({ ...defaults, mapWidth: 390 }).pinScale).toBe(0.08);
    expect(getMapMarkerState({ ...defaults, mapWidth: 768 }).pinScale).toBe(0.5);
  });
});
