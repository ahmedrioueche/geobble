import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import { getCountrySelectionCamera } from "./countrySelectionCamera";

const desktop = { width: 1200, height: 800 };
const mobile = { width: 390, height: 844 };
const bounds: [[number, number], [number, number]] = [
  [400, 300],
  [500, 400],
];

const getHomeTransform = (dimensions: typeof desktop) =>
  d3.zoomIdentity
    .translate(dimensions.width / 2, dimensions.height / 2)
    .scale(dimensions.width < 768 ? 1.8 : 1.3)
    .translate(-dimensions.width / 2, -dimensions.height / 2);

describe("getCountrySelectionCamera", () => {
  it("preserves the current framing when the selected country is already visible", () => {
    const currentTransform = d3.zoomIdentity
      .translate(600, 400)
      .scale(2)
      .translate(-450, -350);

    expect(
      getCountrySelectionCamera(
        bounds,
        currentTransform,
        desktop,
        getHomeTransform(desktop),
      ),
    ).toBeNull();
  });

  it("fits a newly selected country while retaining the current zoom cap", () => {
    const currentTransform = d3.zoomIdentity.scale(3);
    const transform = getCountrySelectionCamera(
      bounds,
      currentTransform,
      desktop,
      getHomeTransform(desktop),
    );

    expect(transform).not.toBeNull();
    if (!transform) return;
    expect(transform.k).toBeLessThanOrEqual(currentTransform.k);
    expect(transform.apply([350, 800 / 3])[0]).toBeCloseTo(desktop.width / 2);
    expect(transform.apply([350, 800 / 3])[1]).toBeCloseTo(desktop.height / 2);
  });

  it("uses the mobile safe-area focus and does not zoom out below home scale", () => {
    const currentTransform = d3.zoomIdentity.scale(1);
    const transform = getCountrySelectionCamera(
      bounds,
      currentTransform,
      mobile,
      getHomeTransform(mobile),
    );

    expect(transform).not.toBeNull();
    if (!transform) return;
    expect(transform.k).toBe(getHomeTransform(mobile).k);
    expect(transform.apply([318.25, 424.3])[0]).toBeCloseTo(mobile.width * 0.35);
    expect(transform.apply([318.25, 424.3])[1]).toBeCloseTo(mobile.height * 0.65);
  });

  it("reframes when the current zoom exceeds the existing threshold", () => {
    const currentTransform = d3.zoomIdentity.scale(6);

    expect(
      getCountrySelectionCamera(
        bounds,
        currentTransform,
        desktop,
        getHomeTransform(desktop),
      ),
    ).not.toBeNull();
  });
});
