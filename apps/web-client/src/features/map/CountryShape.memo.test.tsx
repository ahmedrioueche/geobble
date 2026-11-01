// @vitest-environment jsdom

import * as d3 from "d3";
import { createElement, memo } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  areCountryShapePropsEqual,
  type CountryShapeProps,
} from "./countryShapeProps";
import type { CountryFeature } from "./useWorldMap";

const canada: CountryFeature = {
  type: "Feature",
  id: "124",
  properties: { name: "Canada" },
  geometry: { type: "Polygon", coordinates: [] },
};

const createProps = (): CountryShapeProps => ({
  geometry: {
    feature: canada,
    index: 0,
    name: "Canada",
    code: "124",
    path: "M0,0",
    area: 100,
  },
  pathGenerator: d3.geoPath(),
  fillColor: "var(--color-map-land)",
  isPinMode: false,
  isHighlighted: false,
  isWrongFeedbackItem: false,
  showTitle: false,
  showGuide: false,
  onCountryClick: vi.fn(),
  getEffectiveGeometry: (feature) => feature.geometry,
});

describe("CountryShape memoization", () => {
  it("skips unchanged shape renders and rerenders when a shape's styling changes", () => {
    const renderShape = vi.fn(() => createElement("div"));
    const MemoizedShape = memo(renderShape, areCountryShapePropsEqual);
    const props = createProps();
    const view = render(<MemoizedShape {...props} />);

    view.rerender(<MemoizedShape {...props} />);
    expect(renderShape).toHaveBeenCalledOnce();

    view.rerender(
      <MemoizedShape
        {...props}
        fillColor="#ef4444"
        isHighlighted
        isWrongFeedbackItem
      />,
    );
    expect(renderShape).toHaveBeenCalledTimes(2);
  });

  it("invalidates a shape when its geometry or click handler changes", () => {
    const props = createProps();
    expect(areCountryShapePropsEqual(props, { ...props })).toBe(true);
    expect(
      areCountryShapePropsEqual(props, {
        ...props,
        geometry: { ...props.geometry, path: "M1,1" },
      }),
    ).toBe(false);
    expect(
      areCountryShapePropsEqual(props, {
        ...props,
        onCountryClick: vi.fn(),
      }),
    ).toBe(false);
  });
});
