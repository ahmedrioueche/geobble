import * as d3 from "d3";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

interface MapDimensions {
  width: number;
  height: number;
}

interface UseMapViewportOptions {
  geoData: FeatureCollection | null;
  projection: d3.GeoProjection;
}

export const useMapViewport = ({
  geoData,
  projection,
}: UseMapViewportOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<MapDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const pathGenerator = useMemo(() => {
    if (!geoData || dimensions.width === 0 || dimensions.height === 0) {
      return null;
    }

    const fittedProjection = projection.fitSize(
      [dimensions.width, dimensions.height],
      geoData,
    );
    return d3.geoPath().projection(fittedProjection);
  }, [geoData, dimensions, projection]);

  return { containerRef, dimensions, pathGenerator };
};
