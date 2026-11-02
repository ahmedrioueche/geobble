import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerConfiguration } from '../config/server-configuration.js';

export interface CountryRecord {
  name: string;
  cca2: string;
  cca3: string;
  numericCode: string;
  capitals: string[];
  region: string;
  subregion: string;
  flag: string;
  mapAnchor: [number, number] | null;
}

interface CountryApiRecord {
  name?: { common?: string };
  names?: { common?: string };
  codes?: {
    alpha_2?: string;
    alpha_3?: string;
    numeric?: string | number;
  };
  cca2?: string;
  cca3?: string;
  ccn3?: string;
  capital?: string[] | string;
  capitals?: string[];
  region?: string;
  subregion?: string;
  flag?: string | { emoji?: string };
  latlng?: number[];
  coordinates?: { latlng?: number[] };
}

interface CountryApiPage {
  objects: CountryApiRecord[];
  meta: {
    limit: number;
    offset: number;
    more: boolean;
  };
}

export class CountryCatalogUnavailableError extends Error {
  constructor() {
    super('Country data is temporarily unavailable.');
    this.name = 'CountryCatalogUnavailableError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCountryApiRecord = (value: unknown): value is CountryApiRecord => {
  if (!isRecord(value)) return false;
  const names = isRecord(value.names) ? value.names : undefined;
  const legacyName = isRecord(value.name) ? value.name : undefined;
  const codes = isRecord(value.codes) ? value.codes : undefined;
  return (
    (typeof names?.common === 'string' ||
      typeof legacyName?.common === 'string') &&
    (typeof codes?.alpha_3 === 'string' || typeof value.cca3 === 'string')
  );
};

const isCountryApiPage = (value: unknown): value is CountryApiPage =>
  isRecord(value) &&
  Array.isArray(value.objects) &&
  value.objects.every(isCountryApiRecord) &&
  isRecord(value.meta) &&
  Number.isSafeInteger(value.meta.limit) &&
  typeof value.meta.limit === 'number' &&
  value.meta.limit > 0 &&
  Number.isSafeInteger(value.meta.offset) &&
  typeof value.meta.offset === 'number' &&
  value.meta.offset >= 0 &&
  typeof value.meta.more === 'boolean';

const readString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const readStringArray = (value: unknown): string[] =>
  typeof value === 'string'
    ? value.length > 0
      ? [value]
      : []
    : Array.isArray(value)
      ? value.filter(
          (item): item is string =>
            typeof item === 'string' && item.length > 0,
        )
      : [];

const readCode = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const toMapAnchor = (latlng: number[] | undefined): [number, number] | null => {
  const latitude = latlng?.[0];
  const longitude = latlng?.[1];
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return [longitude, latitude];
};

const toCountryRecord = (country: CountryApiRecord): CountryRecord => {
  const codes = country.codes;
  const names = country.names;
  const countryName = country.name;
  const rawFlag = country.flag;
  const coordinates = country.coordinates;
  const capitals = country.capitals ?? country.capital;
  return {
    name: readString(names?.common ?? countryName?.common).trim(),
    cca2: readString(codes?.alpha_2 ?? country.cca2).toUpperCase(),
    cca3: readString(codes?.alpha_3 ?? country.cca3).toUpperCase(),
    numericCode: readCode(codes?.numeric ?? country.ccn3),
    capitals: readStringArray(capitals),
    region: readString(country.region),
    subregion: readString(country.subregion),
    flag:
      typeof rawFlag === 'string'
        ? rawFlag
        : readString(rawFlag?.emoji),
    mapAnchor: toMapAnchor(coordinates?.latlng ?? country.latlng),
  };
};

const describePayloadShape = (payload: unknown, depth = 0): string => {
  if (Array.isArray(payload)) {
    if (depth >= 3 || payload.length === 0) {
      return `array (${payload.length} items)`;
    }
    return `array (${payload.length} items; item shape: ${describePayloadShape(payload[0], depth + 1)})`;
  }
  if (typeof payload === 'object' && payload !== null) {
    const entries = Object.entries(payload).slice(0, 12);
    if (depth >= 3 || entries.length === 0) {
      return `object (keys: ${entries.map(([key]) => key).join(', ') || 'none'})`;
    }
    const properties = entries
      .map(([key, value]) => `${key}: ${describePayloadShape(value, depth + 1)}`)
      .join('; ');
    return `object (${properties})`;
  }
  return typeof payload;
};

@Injectable()
export class CountryCatalogService {
  private readonly logger = new Logger(CountryCatalogService.name);
  private cachedCountries: CountryRecord[] | null = null;
  private cacheExpiresAt = 0;
  private loading: Promise<CountryRecord[]> | null = null;

  constructor(
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  async getCountries(): Promise<CountryRecord[]> {
    if (this.cachedCountries && Date.now() < this.cacheExpiresAt) {
      return this.cachedCountries;
    }

    if (!this.loading) {
      this.loading = this.loadCountries();
    }

    try {
      const countries = await this.loading;
      this.cachedCountries = countries;
      this.cacheExpiresAt =
        Date.now() + this.config.getOrThrow('countryDataCacheMs');
      return countries;
    } finally {
      this.loading = null;
    }
  }

  private async loadCountries(): Promise<CountryRecord[]> {
    try {
      const headers = new Headers();
      const apiKey = this.config.getOrThrow('restCountriesApiKey');
      if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`);

      const countryPayload = await this.fetchCountryRecords(
        this.config.getOrThrow('restCountriesApiUrl'),
        headers,
      );

      const countries = countryPayload
        .map(toCountryRecord)
        .filter((country) => country.name && /^[A-Z]{3}$/.test(country.cca3));

      if (countries.length === 0) {
        this.logger.error('Country catalog response contained no usable countries');
        throw new CountryCatalogUnavailableError();
      }

      return countries;
    } catch (error) {
      if (error instanceof CountryCatalogUnavailableError) throw error;
      this.logger.error(
        `Country catalog could not be loaded (${error instanceof Error ? error.name : 'unknown error'})`,
      );
      throw new CountryCatalogUnavailableError();
    }
  }

  private async fetchCountryRecords(
    endpoint: string,
    headers: Headers,
  ): Promise<CountryApiRecord[]> {
    const countries: CountryApiRecord[] = [];
    const requestUrl = new URL(endpoint);
    let expectedOffset: number | null = null;

    while (true) {
      const response = await fetch(requestUrl, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.error(
          `Country catalog request failed with status ${response.status}`,
        );
        throw new CountryCatalogUnavailableError();
      }

      const payload: unknown = await response.json();
      if (Array.isArray(payload)) {
        if (!payload.every(isCountryApiRecord)) {
          this.logInvalidResponse(response, payload);
          throw new CountryCatalogUnavailableError();
        }
        return payload;
      }

      if (!isRecord(payload)) {
        this.logInvalidResponse(response, payload);
        throw new CountryCatalogUnavailableError();
      }

      if (Array.isArray(payload.data)) {
        if (!payload.data.every(isCountryApiRecord)) {
          this.logInvalidResponse(response, payload);
          throw new CountryCatalogUnavailableError();
        }
        countries.push(...payload.data);
        return countries;
      }

      const page = isCountryApiPage(payload.data) ? payload.data : null;
      if (!page || (expectedOffset !== null && page.meta.offset !== expectedOffset)) {
        this.logInvalidResponse(response, payload);
        throw new CountryCatalogUnavailableError();
      }

      countries.push(...page.objects);
      if (!page.meta.more) return countries;

      const nextOffset = page.meta.offset + page.meta.limit;
      if (nextOffset <= page.meta.offset) {
        this.logger.error('Country catalog pagination did not advance');
        throw new CountryCatalogUnavailableError();
      }
      expectedOffset = nextOffset;
      requestUrl.searchParams.set('offset', String(nextOffset));
    }
  }

  private logInvalidResponse(response: Response, payload: unknown): void {
    this.logger.error(
      `Country catalog response did not match the expected shape (content-type: ${response.headers.get('content-type') ?? 'missing'}; payload: ${describePayloadShape(payload)})`,
    );
  }
}
