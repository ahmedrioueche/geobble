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

interface RestCountry {
  name?: { common?: string };
  cca2?: string;
  cca3?: string;
  ccn3?: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  flag?: string;
  latlng?: number[];
}

export class CountryCatalogUnavailableError extends Error {
  constructor() {
    super('Country data is temporarily unavailable.');
    this.name = 'CountryCatalogUnavailableError';
  }
}

const isRestCountry = (value: unknown): value is RestCountry =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RestCountry).name?.common === 'string' &&
  typeof (value as RestCountry).cca3 === 'string';

@Injectable()
export class CountryCatalogService {
  private readonly logger = new Logger(CountryCatalogService.name);
  private cachedCountries: CountryRecord[] | null = null;
  private cacheExpiresAt = 0;
  private loading: Promise<CountryRecord[]> | null = null;

  constructor(
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  private toMapAnchor(latlng: number[] | undefined): [number, number] | null {
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
  }

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

      const response = await fetch(
        this.config.getOrThrow('restCountriesApiUrl'),
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!response.ok) {
        this.logger.error(
          `Country catalog request failed with status ${response.status}`,
        );
        throw new CountryCatalogUnavailableError();
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !payload.every(isRestCountry)) {
        this.logger.error('Country catalog response did not match the expected shape');
        throw new CountryCatalogUnavailableError();
      }

      const countries = payload
        .map((country) => ({
          name: country.name?.common?.trim() ?? '',
          cca2: country.cca2?.toUpperCase() ?? '',
          cca3: country.cca3?.toUpperCase() ?? '',
          numericCode: country.ccn3 ?? '',
          capitals: (country.capital ?? []).filter(Boolean),
          region: country.region ?? '',
          subregion: country.subregion ?? '',
          flag: country.flag ?? '',
          mapAnchor: this.toMapAnchor(country.latlng),
        }))
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
}
