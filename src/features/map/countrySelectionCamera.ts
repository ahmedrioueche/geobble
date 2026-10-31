import * as d3 from "d3";

interface MapDimensions {
  width: number;
  height: number;
}

type Bounds = [[number, number], [number, number]];

export const getCountrySelectionCamera = (
  bounds: Bounds,
  currentTransform: d3.ZoomTransform,
  dimensions: MapDimensions,
  homeTransform: d3.ZoomTransform,
): d3.ZoomTransform | null => {
  const [[x0, y0], [x1, y1]] = bounds;
  const point0 = currentTransform.apply([x0, y0]);
  const point1 = currentTransform.apply([x1, y1]);
  const margin = 30;
  const isInView =
    point0[0] > margin &&
    point0[1] > margin &&
    point1[0] < dimensions.width - margin &&
    point1[1] < dimensions.height - margin;
  if (isInView && currentTransform.k < 6) return null;

  const isMobile = dimensions.width < 768;
  const viewCenterX = isMobile ? dimensions.width * 0.35 : dimensions.width / 2;
  const viewCenterY = isMobile
    ? dimensions.height * 0.65
    : dimensions.height / 2;
  const currentCenterX =
    (viewCenterX - currentTransform.x) / currentTransform.k;
  const currentCenterY =
    (viewCenterY - currentTransform.y) / currentTransform.k;
  const contextMinX = Math.min(currentCenterX, x0);
  const contextMaxX = Math.max(currentCenterX, x1);
  const contextMinY = Math.min(currentCenterY, y0);
  const contextMaxY = Math.max(currentCenterY, y1);
  const contextWidth = contextMaxX - contextMinX;
  const contextHeight = contextMaxY - contextMinY;
  const contextMidX = (contextMinX + contextMaxX) / 2;
  const contextMidY = (contextMinY + contextMaxY) / 2;
  const contextScale = Math.min(
    currentTransform.k,
    0.65 /
      Math.max(
        contextWidth / dimensions.width,
        contextHeight / dimensions.height,
      ),
  );
  const finalScale = Math.max(homeTransform.k, contextScale);

  return d3.zoomIdentity
    .translate(viewCenterX, viewCenterY)
    .scale(finalScale)
    .translate(-contextMidX, -contextMidY);
};
