import { useEffect, useState } from "react";
import { fetchCountries, type CountryData } from "../../../../data/country-data";
import { FALLBACK_COUNTRIES } from "../../../../data/fallback-countries";
import { loadWorldMapData } from "../../../map/worldMapData";

export const useCountryData = () => {
  const [countries, setCountries] = useState<CountryData[]>(FALLBACK_COUNTRIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countryResponse, mapData] = await Promise.all([
          fetchCountries(),
          loadWorldMapData(),
        ]);

        const sourceCountries =
          countryResponse.length > 0 ? countryResponse : FALLBACK_COUNTRIES;
        const filtered = sourceCountries.filter(
          (country) =>
            mapData.availableMapIds.has(country.cca3) ||
            mapData.availableMapIds.has(country.cca2) ||
            mapData.availableMapIds.has(country.ccn3) ||
            mapData.availableMapIds.has(
              parseInt(country.ccn3 || "0", 10)?.toString(),
            ),
        );

        setCountries(filtered.length > 0 ? filtered : FALLBACK_COUNTRIES);
      } catch (error) {
        console.error("Error setting up tactical data:", error);
        const data = await fetchCountries();
        setCountries(data.length > 0 ? data : FALLBACK_COUNTRIES);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  return { countries, loading };
};
