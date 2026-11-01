import * as d3 from "d3";

interface MapDimensions {
  width: number;
  height: number;
}

type Bounds = [[number, number], [number, number]];

export const getSonarCamera = (
  bounds: Bounds,
  dimensions: MapDimensions,
): d3.ZoomTransform => {
  const [[x0, y0], [x1, y1]] = bounds;
  const width = x1 - x0;
  const height = y1 - y0;
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const isMobile = dimensions.width < 768;
  const targetCenterX = isMobile
    ? dimensions.width * 0.35
    : dimensions.width / 2;
  const targetCenterY = isMobile
    ? dimensions.height * 0.65
    : dimensions.height / 2;
  const scale = Math.max(
    1,
    Math.min(
      25,
      0.45 /
        Math.max(width / dimensions.width, height / dimensions.height),
    ),
  );

  return d3.zoomIdentity
    .translate(targetCenterX, targetCenterY)
    .scale(scale)
    .translate(-centerX, -centerY);
};
