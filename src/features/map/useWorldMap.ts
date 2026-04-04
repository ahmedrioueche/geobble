import * as d3 from "d3";
import type { FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";

export interface CountryFeature {
  type: "Feature";
  id: string;
  properties: {
    name: string;
  };
  geometry: Geometry;
}

export const useWorldMap = () => {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/data/world.json");
        if (!response.ok) throw new Error("Failed to fetch map data");
        const data = await response.json();

        // Convert topojson back to geojson
        // In countries-110m.json, the key is usually 'countries'
        const geojson = feature(
          data,
          data.objects.countries,
        ) as unknown as FeatureCollection;
        setGeoData(geojson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const projection = useMemo(() => {
    return d3.geoNaturalEarth1();
  }, []);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  return { geoData, projection, pathGenerator, loading, error };
};
