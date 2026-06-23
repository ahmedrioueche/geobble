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

interface RestCountryV5Capital {
  name: string;
  attributes?: { primary?: boolean };
}

interface RestCountryV5 {
  names: {
    common: string;
    official: string;
  };
  codes: {
    alpha_2: string;
    alpha_3: string;
    ccn3?: string;
  };
  capitals?: RestCountryV5Capital[];
  region: string;
  subregion?: string;
  flag: {
    emoji: string;
  };
  population: number;
}

interface RestCountriesV5Response {
  data: {
    objects: RestCountryV5[];
    meta: {
      more: boolean;
    };
  };
}

const API_BASE = '/api/countries';
const PAGE_LIMIT = 100;
const RESPONSE_FIELDS = [
  'names.common',
  'names.official',
  'codes.alpha_2',
  'codes.alpha_3',
  'codes.ccn3',
  'capitals',
  'region',
  'subregion',
  'flag.emoji',
  'population',
].join(',');

const mapRestCountry = (c: RestCountryV5): CountryData => ({
  name: c.names.common,
  officialName: c.names.official,
  cca2: c.codes.alpha_2,
  cca3: c.codes.alpha_3,
  ccn3: c.codes.ccn3 || '',
  capital: (c.capitals ?? []).map((cap) => cap.name),
  region: c.region,
  subregion: c.subregion || '',
  flag: c.flag.emoji,
  population: c.population,
});

export const fetchCountries = async (): Promise<CountryData[]> => {
  try {
    const countries: CountryData[] = [];
    let offset = 0;
    let more = true;

    while (more) {
      const response = await axios.get<RestCountriesV5Response>(API_BASE, {
        params: {
          response_fields: RESPONSE_FIELDS,
          limit: PAGE_LIMIT,
          offset,
        },
      });

      const { objects, meta } = response.data.data;
      countries.push(...objects.map(mapRestCountry));
      more = meta.more;
      offset += PAGE_LIMIT;
    }

    return countries;
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
