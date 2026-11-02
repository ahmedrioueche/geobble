import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerConfiguration } from '../config/server-configuration.js';
import { CountryCatalogService } from './country-catalog.service.js';

const createConfig = (): ConfigService<ServerConfiguration, true> =>
  new ConfigService<ServerConfiguration, true>({
    port: 3000,
    mongoUri: 'mongodb://localhost/test',
    clientOrigins: ['http://localhost:5173'],
    roomMaxPlayers: 8,
    roomIdLength: 8,
    socketEventsPerMinute: 120,
    maxChallengeValue: 500,
    reconnectGraceMs: 60_000,
    roomExpiryHours: 24,
    roundAdvanceDelayMs: 1_500,
    pointsPerCorrectAnswer: 10,
    streakBonusPoints: 5,
    choicesPerRound: 4,
    countryDataCacheMs: 3_600_000,
    restCountriesApiUrl: 'https://countries.example.test/all',
    restCountriesApiKey: null,
  });

describe('CountryCatalogService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('logs response content type and payload keys without response values', async () => {
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Upstream API key rejected' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(new CountryCatalogService(createConfig()).getCountries()).rejects.toThrow(
      'Country data is temporarily unavailable.',
    );

    expect(loggerError).toHaveBeenCalledWith(
      'Country catalog response did not match the expected shape (content-type: application/json; payload: object (message: string))',
    );
    expect(loggerError).not.toHaveBeenCalledWith(
      expect.stringContaining('Upstream API key rejected'),
    );
  });

  it('maps the v5 data envelope and nested country fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              objects: [
                {
                  names: { common: 'Canada' },
                  codes: { alpha_2: 'ca', alpha_3: 'can', numeric: '124' },
                  capitals: ['Ottawa'],
                  region: 'Americas',
                  subregion: 'North America',
                  flag: { emoji: '🇨🇦' },
                  coordinates: { latlng: [56, -106] },
                },
              ],
              meta: {
                total: 1,
                count: 1,
                limit: 25,
                offset: 0,
                more: false,
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      new CountryCatalogService(createConfig()).getCountries(),
    ).resolves.toEqual([
      {
        name: 'Canada',
        cca2: 'CA',
        cca3: 'CAN',
        numericCode: '124',
        capitals: ['Ottawa'],
        region: 'Americas',
        subregion: 'North America',
        flag: '🇨🇦',
        mapAnchor: [-106, 56],
      },
    ]);
  });

  it('fetches all pages of the v5 catalog using its pagination metadata', async () => {
    const requestedOffsets: Array<string | null> = [];
    const fetchMock = vi.fn().mockImplementation((input: URL) => {
      const offset = Number(input.searchParams.get('offset') ?? '0');
      requestedOffsets.push(input.searchParams.get('offset'));
      const isFirstPage = offset === 0;
      const country = isFirstPage
        ? {
            names: { common: 'Canada' },
            codes: { alpha_2: 'CA', alpha_3: 'CAN', numeric: '124' },
            capitals: ['Ottawa'],
          }
        : {
            names: { common: 'France' },
            codes: { alpha_2: 'FR', alpha_3: 'FRA', numeric: '250' },
            capitals: ['Paris'],
          };
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              objects: [country],
              meta: {
                total: 2,
                count: 1,
                limit: 1,
                offset,
                more: isFirstPage,
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const countries = await new CountryCatalogService(createConfig()).getCountries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedOffsets).toEqual([null, '1']);
    expect(countries.map((country) => country.cca3)).toEqual(['CAN', 'FRA']);
  });

  it('continues to map the legacy array response shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              name: { common: 'France' },
              cca2: 'FR',
              cca3: 'FRA',
              ccn3: '250',
              capital: ['Paris'],
              region: 'Europe',
              subregion: 'Western Europe',
              flag: '🇫🇷',
              latlng: [46, 2],
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      new CountryCatalogService(createConfig()).getCountries(),
    ).resolves.toEqual([
      {
        name: 'France',
        cca2: 'FR',
        cca3: 'FRA',
        numericCode: '250',
        capitals: ['Paris'],
        region: 'Europe',
        subregion: 'Western Europe',
        flag: '🇫🇷',
        mapAnchor: [2, 46],
      },
    ]);
  });
});
