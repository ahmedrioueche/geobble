import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

interface MapDimensions {
  width: number;
  height: number;
}

interface UseMapZoomOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  groupRef: RefObject<SVGGElement | null>;
  dimensions: MapDimensions;
  pathGenerator: d3.GeoPath | null;
}

export const useMapZoom = ({
  svgRef,
  groupRef,
  dimensions,
  pathGenerator,
}: UseMapZoomOptions) => {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !groupRef.current || !pathGenerator) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    const group = d3.select(groupRef.current);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .extent([
        [0, 0],
        [dimensions.width, dimensions.height],
      ])
      .translateExtent([
        [-dimensions.width * 0.15, -dimensions.height * 0.15],
        [dimensions.width * 1.15, dimensions.height * 1.15],
      ])
      .on("zoom", (event) => {
        group.attr("transform", event.transform);
        group.style(
          "--map-stroke-width",
          `${Math.max(0.12, 0.5 / event.transform.k)}px`,
        );
        group.style(
          "--map-selected-stroke-width",
          `${Math.max(0.4, 1.2 / event.transform.k)}px`,
        );
      });

    zoomRef.current = zoom;
    svg.call(zoom);
    group.style("--map-stroke-width", "0.65px");
    group.style("--map-selected-stroke-width", "1.5px");

    return () => {
      svg.on(".zoom", null);
      if (zoomRef.current === zoom) zoomRef.current = null;
    };
  }, [dimensions, groupRef, pathGenerator, svgRef]);

  return zoomRef;
};
