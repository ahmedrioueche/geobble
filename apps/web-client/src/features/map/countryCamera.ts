import * as d3 from "d3";
import type { GameMode } from "../../store/useGameStore";

interface MapDimensions {
  width: number;
  height: number;
}

type Bounds = [[number, number], [number, number]];

interface CountryCamera {
  transform: d3.ZoomTransform;
  isAlreadyFramed: boolean;
}

export const getCountryCamera = (
  bounds: Bounds,
  currentTransform: d3.ZoomTransform,
  dimensions: MapDimensions,
  mode: GameMode,
): CountryCamera => {
  const [[x0, y0], [x1, y1]] = bounds;
  const width = x1 - x0;
  const height = y1 - y0;
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const scaleFactor = mode === "reverse" ? 0.425 : 0.5;
  const scale = Math.max(
    1,
    Math.min(
      25,
      scaleFactor /
        Math.max(width / dimensions.width, height / dimensions.height),
    ),
  );
  const isMobile = dimensions.width < 768;
  const targetCenterX = isMobile
    ? dimensions.width * 0.35
    : dimensions.width / 2;
  const targetCenterY = isMobile
    ? dimensions.height * 0.65
    : dimensions.height / 2;
  const transform = d3.zoomIdentity
    .translate(targetCenterX, targetCenterY)
    .scale(scale)
    .translate(-centerX, -centerY);
  const point0 = currentTransform.apply([x0, y0]);
  const point1 = currentTransform.apply([x1, y1]);
  const projectedCenter = currentTransform.apply([centerX, centerY]);
  const margin = 40;
  const isInView =
    point0[0] > margin &&
    point0[1] > margin &&
    point1[0] < dimensions.width - margin &&
    point1[1] < dimensions.height - margin;
  const isGoodScale = Math.abs(Math.log2(currentTransform.k / scale)) < 0.2;
  const isCentered =
    Math.hypot(
      projectedCenter[0] - targetCenterX,
      projectedCenter[1] - targetCenterY,
    ) < 24;

  return {
    transform,
    isAlreadyFramed: isInView && isGoodScale && isCentered,
  };
};

export const getMissionOverviewCamera = (
  currentTransform: d3.ZoomTransform,
  homeTransform: d3.ZoomTransform,
): d3.ZoomTransform | null =>
  currentTransform.k > homeTransform.k ? homeTransform : null;
