// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import type { CountryFeature } from "./useWorldMap";
import { WorldMapCanvas } from "./WorldMapCanvas";

describe("WorldMapCanvas", () => {
  it("renders the sized map canvas, layers, and pan/zoom guidance", () => {
    const svgRef = createRef<SVGSVGElement>();
    const groupRef = createRef<SVGGElement>();
    const view = render(
      <div className="relative">
        <WorldMapCanvas
          svgRef={svgRef}
          groupRef={groupRef}
          dimensions={{ width: 800, height: 600 }}
          countryLayerProps={{
            features: null,
            pathGenerator: null,
            idToCodeLookup: {},
            gameStatus: "idle",
            mode: "identify",
            revealed: false,
            feedback: null,
            clickedCode: null,
            clickedName: null,
            tempHighlightCode: null,
            onCountryClick: () => undefined,
            getEffectiveGeometry: (feature: CountryFeature) =>
              feature.geometry,
          }}
          mapMarkerProps={{
            targetPinPoint: null,
            guessPinPoint: null,
            sonarPoint: null,
            feedback: null,
            gameStatus: "idle",
            pulseKey: 0,
            pinScale: 0.5,
          }}
        />
      </div>,
    );

    expect(svgRef.current?.getAttribute("width")).toBe("800");
    expect(svgRef.current?.getAttribute("height")).toBe("600");
    expect(groupRef.current?.classList.contains("map-features")).toBe(true);
    expect(view.getByText("Drag to Pan • Scroll to Zoom")).not.toBeNull();
  });
});
