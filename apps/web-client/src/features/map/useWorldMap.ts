import * as d3 from "d3";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { loadWorldMapData } from "./worldMapData";

export interface CountryProperties {
  name: string;
}

export interface CountryFeature extends Feature<Geometry, CountryProperties> {
  id: string;
  properties: CountryProperties;
}

export type CountryFeatureCollection = Omit<
  FeatureCollection<Geometry, CountryProperties>,
  "features"
> & {
  features: CountryFeature[];
};

export const useWorldMap = () => {
  const [geoData, setGeoData] = useState<CountryFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mapData = await loadWorldMapData();
        setGeoData(mapData.geoData);
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
