import * as d3 from "d3";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";

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

  const availableCodes = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map(({ id }) => id);
  }, [geoData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/data/world.json");
        if (!response.ok) throw new Error("Failed to fetch map data");
        const data = await response.json();

        // Convert topojson back to geojson
        // world-atlas v2 uses 'countries' key
        const geojson = feature(
          data,
          data.objects.countries,
        ) as unknown as CountryFeatureCollection;
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

  return { geoData, projection, pathGenerator, loading, error, availableCodes };
};
