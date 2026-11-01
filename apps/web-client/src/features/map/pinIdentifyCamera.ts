import * as d3 from "d3";

interface MapDimensions {
  width: number;
  height: number;
}

interface PinIdentifyCamera {
  transform: d3.ZoomTransform;
  isAlreadyFocused: boolean;
}

export const getPinIdentifyCamera = (
  point: [number, number],
  currentTransform: d3.ZoomTransform,
  dimensions: MapDimensions,
): PinIdentifyCamera => {
  const isMobile = dimensions.width < 768;
  const targetCenterX = isMobile
    ? dimensions.width * 0.35
    : dimensions.width / 2;
  const targetCenterY = isMobile
    ? dimensions.height * 0.65
    : dimensions.height / 2;
  const targetScale = Math.max(currentTransform.k, isMobile ? 2.8 : 4);
  const screenPoint = currentTransform.apply(point);
  const isCentered =
    Math.abs(screenPoint[0] - targetCenterX) < dimensions.width * 0.12 &&
    Math.abs(screenPoint[1] - targetCenterY) < dimensions.height * 0.12;
  const isGoodScale =
    Math.abs(Math.log2(currentTransform.k / targetScale)) < 0.25;
  const transform = d3.zoomIdentity
    .translate(targetCenterX, targetCenterY)
    .scale(targetScale)
    .translate(-point[0], -point[1]);

  return {
    transform,
    isAlreadyFocused: isCentered && isGoodScale,
  };
};
