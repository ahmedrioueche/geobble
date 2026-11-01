// @vitest-environment jsdom

import * as d3 from "d3";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorldMapView, type WorldMapViewProps } from "./WorldMapView";

const mocks = vi.hoisted(() => ({
  countryLayer: vi.fn<(props: Record<string, unknown>) => null>(() => null),
  mapMarkers: vi.fn<(props: Record<string, unknown>) => null>(() => null),
  useMapViewport: vi.fn(),
  useMapCountryData: vi.fn(),
  useMapCamera: vi.fn(),
  useMapSonarPoint: vi.fn(),
  getMapMarkerState: vi.fn(),
}));

vi.mock("./CountryLayer", () => ({ CountryLayer: mocks.countryLayer }));
vi.mock("./MapMarkers", () => ({ MapMarkers: mocks.mapMarkers }));
vi.mock("./useMapViewport", () => ({
  useMapViewport: mocks.useMapViewport,
}));
vi.mock("./useMapCountryData", () => ({
  useMapCountryData: mocks.useMapCountryData,
}));
vi.mock("./useMapCamera", () => ({ useMapCamera: mocks.useMapCamera }));
vi.mock("./useMapSonarPoint", () => ({
  useMapSonarPoint: mocks.useMapSonarPoint,
}));
vi.mock("./mapMarkerState", () => ({
  getMapMarkerState: mocks.getMapMarkerState,
}));

const props: WorldMapViewProps = {
  geoData: null,
  projection: d3.geoNaturalEarth1(),
  loading: false,
  error: null,
  countries: [],
  gameStatus: "playing",
  mode: "reverse",
  pinDirection: "identify",
  pinLocation: null,
  revealed: true,
  feedback: "wrong",
  clickedCode: "CAN",
  clickedName: "Canada",
  pulseKey: 3,
  sonarKey: 2,
  tempHighlightCode: "FRA",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useMapViewport.mockReturnValue({
    containerRef: { current: null },
    dimensions: { width: 800, height: 600 },
    pathGenerator: {},
  });
  mocks.useMapCountryData.mockReturnValue({
    features: [],
    idToCodeLookup: {},
    targetPinCoordinates: null,
  });
  mocks.useMapCamera.mockReturnValue({
    getEffectiveGeometry: vi.fn(),
  });
  mocks.useMapSonarPoint.mockReturnValue(null);
  mocks.getMapMarkerState.mockReturnValue({
    targetPinPoint: null,
    guessPinPoint: null,
    pinScale: 0.5,
  });
});

describe("WorldMapView", () => {
  it("uses explicit gameplay and UI props to configure the map layers", () => {
    render(<WorldMapView {...props} />);

    expect(mocks.useMapViewport).toHaveBeenCalledWith(
      expect.objectContaining({
        geoData: null,
        projection: props.projection,
      }),
    );
    expect(mocks.useMapCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        gameStatus: "playing",
        mode: "reverse",
        pinDirection: "identify",
        revealed: true,
        sonarKey: 2,
      }),
    );
    expect(mocks.countryLayer.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        gameStatus: "playing",
        mode: "reverse",
        revealed: true,
        feedback: "wrong",
        clickedCode: "CAN",
        clickedName: "Canada",
        tempHighlightCode: "FRA",
      }),
    );
    expect(mocks.getMapMarkerState).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "reverse",
        gameStatus: "playing",
        pinDirection: "identify",
        pinLocation: null,
        revealed: true,
      }),
    );
    expect(mocks.mapMarkers.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        feedback: "wrong",
        gameStatus: "playing",
        pulseKey: 3,
      }),
    );
  });
});
