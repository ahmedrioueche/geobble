// @vitest-environment jsdom

import * as d3 from "d3";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CountryFeature } from "./useWorldMap";
import { CountryLayer } from "./CountryLayer";

const canada: CountryFeature = {
  type: "Feature",
  id: "124",
  properties: { name: "Canada" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [[-100, 40], [-90, 40], [-90, 50], [-100, 50], [-100, 40]],
    ],
  },
};

const france: CountryFeature = {
  ...canada,
  id: "250",
  properties: { name: "France" },
};

describe("CountryLayer", () => {
  it("reuses projected path and area when only feedback styling changes", () => {
    const pathGenerator = d3
      .geoPath()
      .projection(d3.geoEquirectangular());
    const areaSpy = vi.spyOn(pathGenerator, "area");
    const onCountryClick = vi.fn();
    const baseProps = {
      features: [canada],
      pathGenerator,
      idToCodeLookup: { "124": "CAN", canada: "CAN" },
      selectedCountryCode: "CAN",
      gameStatus: "playing" as const,
      mode: "identify" as const,
      revealed: false,
      feedback: null,
      clickedCode: null,
      clickedName: null,
      tempHighlightCode: null,
      onCountryClick,
      getEffectiveGeometry: (feature: CountryFeature) => feature.geometry,
    };

    const view = render(
      <svg>
        <CountryLayer {...baseProps} />
      </svg>,
    );
    const pathElement = view.container.querySelector("path");
    expect(pathElement).not.toBeNull();
    expect(pathElement?.getAttribute("d")).toBeTruthy();
    expect(areaSpy).toHaveBeenCalledTimes(1);

    view.rerender(
      <svg>
        <CountryLayer
          {...baseProps}
          feedback="correct"
          clickedCode="124"
          clickedName="Canada"
        />
      </svg>,
    );

    expect(pathElement?.style.fill).toBe("rgb(34, 197, 94)");
    expect(areaSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(pathElement!);
    expect(onCountryClick).toHaveBeenCalledOnce();
  });

  it("recalculates projected geometry when features or projection changes", () => {
    const firstPath = d3.geoPath().projection(d3.geoEquirectangular());
    const secondPath = d3.geoPath().projection(d3.geoMercator());
    const firstAreaSpy = vi.spyOn(firstPath, "area");
    const secondAreaSpy = vi.spyOn(secondPath, "area");
    const props = {
      features: [canada],
      pathGenerator: firstPath,
      idToCodeLookup: { "124": "CAN", canada: "CAN" },
      gameStatus: "idle" as const,
      mode: "identify" as const,
      revealed: false,
      feedback: null,
      clickedCode: null,
      clickedName: null,
      tempHighlightCode: null,
      onCountryClick: vi.fn(),
      getEffectiveGeometry: (feature: CountryFeature) => feature.geometry,
    };
    const view = render(
      <svg>
        <CountryLayer {...props} />
      </svg>,
    );

    view.rerender(
      <svg>
        <CountryLayer {...props} features={[canada, france]} />
      </svg>,
    );
    view.rerender(
      <svg>
        <CountryLayer {...props} pathGenerator={secondPath} />
      </svg>,
    );

    expect(firstAreaSpy).toHaveBeenCalledTimes(3);
    expect(secondAreaSpy).toHaveBeenCalledOnce();
  });
});
