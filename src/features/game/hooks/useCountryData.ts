import { useEffect, useState } from "react";
import { fetchCountries, type CountryData } from "../../../data/country-data";

interface WorldMapData {
  objects: {
    countries: {
      geometries: Array<{ id?: string | number }>;
    };
  };
}

export const useCountryData = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countryResponse, mapResponse] = await Promise.all([
          fetchCountries(),
          fetch("/data/world.json"),
        ]);

        if (!mapResponse.ok) throw new Error("Failed to load map data");
        const mapData: WorldMapData = await mapResponse.json();

        const availableMapIds = new Set(
          mapData.objects.countries.geometries.map((geometry) =>
            geometry.id?.toString(),
          ),
        );
        const filtered = countryResponse.filter(
          (country) =>
            availableMapIds.has(country.cca3) ||
            availableMapIds.has(country.cca2) ||
            availableMapIds.has(country.ccn3) ||
            availableMapIds.has(
              parseInt(country.ccn3 || "0", 10)?.toString(),
            ),
        );

        setCountries(filtered);
      } catch (error) {
        console.error("Error setting up tactical data:", error);
        const data = await fetchCountries();
        setCountries(data);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  return { countries, loading };
};
