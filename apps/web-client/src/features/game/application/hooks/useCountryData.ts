import { useEffect, useState } from "react";
import { fetchCountries, type CountryData } from "../../../../data/country-data";
import { loadWorldMapData } from "../../../map/worldMapData";

export const useCountryData = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countryResponse, mapData] = await Promise.all([
          fetchCountries(),
          loadWorldMapData(),
        ]);

        const filtered = countryResponse.filter(
          (country) =>
            mapData.availableMapIds.has(country.cca3) ||
            mapData.availableMapIds.has(country.cca2) ||
            mapData.availableMapIds.has(country.ccn3) ||
            mapData.availableMapIds.has(
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
