import axios from 'axios';

export interface CountryData {
  name: string;
  officialName: string;
  cca2: string;
  cca3: string;
  ccn3: string;
  capital: string[];
  region: string;
  subregion: string;
  flag: string;
  population: number;
}

interface RestCountry {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  ccn3?: string;
  capital?: string[];
  region: string;
  subregion?: string;
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  population: number;
  flag: string;
}

export const fetchCountries = async (): Promise<CountryData[]> => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,ccn3,capital,region,subregion,flags,population,flag');
    return response.data.map((c: RestCountry) => ({
      name: c.name.common,
      officialName: c.name.official,
      cca2: c.cca2,
      cca3: c.cca3,
      ccn3: c.ccn3 || '',
      capital: c.capital || [],
      region: c.region,
      subregion: c.subregion || '',
      flag: c.flag,
      population: c.population,
    }));
  } catch (error) {
    console.error('Error fetching country data:', error);
    return [];
  }
};

export const normalizeData = (data: CountryData[]) => {
  const normalized: Record<string, CountryData> = {};
  data.forEach((c) => {
    normalized[c.cca3] = c;
    normalized[c.name.toLowerCase()] = c;
  });
  return normalized;
};
