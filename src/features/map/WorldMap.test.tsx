// @vitest-environment jsdom

import * as d3 from "d3";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryFeatureCollection } from "./useWorldMap";
import { WorldMap } from "./WorldMap";

const mocks = vi.hoisted(() => ({
  useGameStore: vi.fn(),
  useGameUiStore: vi.fn(),
  useMapUiStore: vi.fn(),
  useWorldMap: vi.fn(),
  worldMapView: vi.fn<(props: Record<string, unknown>) => null>(() => null),
}));

vi.mock("../../store/useGameStore", () => ({
  useGameStore: mocks.useGameStore,
}));
vi.mock("../../store/useGameUiStore", () => ({
  useGameUiStore: mocks.useGameUiStore,
}));
vi.mock("../../store/useMapUiStore", () => ({
  useMapUiStore: mocks.useMapUiStore,
}));
vi.mock("./useWorldMap", () => ({ useWorldMap: mocks.useWorldMap }));
vi.mock("./WorldMapView", () => ({ WorldMapView: mocks.worldMapView }));

describe("WorldMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGameStore.mockReturnValue({
      gameStatus: "playing",
      mode: "pin",
      pinDirection: "locate",
      pinLocation: [10, 20],
      revealed: false,
    });
    mocks.useGameUiStore.mockReturnValue({
      feedback: null,
      clickedCode: null,
      clickedName: null,
    });
    mocks.useMapUiStore.mockReturnValue({
      pulseKey: 0,
      sonarKey: 0,
      tempHighlightCode: null,
    });
  });

  it("loads map resources at the wrapper and passes them into the view", () => {
    const geoData: CountryFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const projection = d3.geoNaturalEarth1();
    mocks.useWorldMap.mockReturnValue({
      geoData,
      projection,
      loading: false,
      error: null,
      pathGenerator: d3.geoPath().projection(projection),
    });

    render(<WorldMap countries={[]} />);

    expect(mocks.useWorldMap).toHaveBeenCalledOnce();
    expect(mocks.worldMapView.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        geoData,
        projection,
        loading: false,
        error: null,
      }),
    );
  });

  it("forwards loading and error state to the view", () => {
    const projection = d3.geoNaturalEarth1();
    mocks.useWorldMap.mockReturnValue({
      geoData: null,
      projection,
      loading: false,
      error: "Failed to load map data",
      pathGenerator: d3.geoPath().projection(projection),
    });

    render(<WorldMap />);

    expect(mocks.worldMapView.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        geoData: null,
        projection,
        loading: false,
        error: "Failed to load map data",
      }),
    );
  });
});
