import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerConfiguration } from '../config/server-configuration.js';
import { CountryCatalogService } from './country-catalog.service.js';
import { WORLD_MAP_NUMERIC_IDS } from './world-map-countries.js';

const createConfig = (
  restCountriesApiUrl = 'https://countries.example.test/all',
): ConfigService<ServerConfiguration, true> =>
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
    restCountriesApiUrl,
    restCountriesApiKey: null,
  });

  it('uses the primary capital coordinates as a map anchor in v5 records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              objects: [
                {
                  names: { common: 'Canada' },
                  codes: { alpha_2: 'CA', alpha_3: 'CAN' },
                  capitals: [
                    {
                      name: 'Toronto',
                      coordinates: { lat: 43.65, lng: -79.38 },
                    },
                    {
                      name: 'Ottawa',
                      primary: true,
                      coordinates: { lat: 45.42, lng: -75.7 },
                    },
                  ],
                },
              ],
              meta: { limit: 25, offset: 0, more: false },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      new CountryCatalogService(createConfig()).getCountries(),
    ).resolves.toEqual([
      expect.objectContaining({
        capitals: ['Toronto', 'Ottawa'],
        mapAnchor: [-75.7, 45.42],
      }),
    ]);
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
                  capitals: [
                    {
                      name: 'Ottawa',
                      primary: true,
                      coordinates: { lat: 45.42, lng: -75.7 },
                    },
                  ],
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

  it('requests map coordinates from REST Countries v5 when custom fields omit them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            objects: [
              {
                names: { common: 'Canada' },
                codes: { alpha_3: 'CAN' },
                capitals: [
                  {
                    name: 'Ottawa',
                    primary: true,
                    coordinates: { lat: 45.42, lng: -75.7 },
                  },
                ],
              },
            ],
            meta: { limit: 25, offset: 0, more: false },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const config = createConfig(
      'https://api.restcountries.com/countries/v5?response_fields=names.common,codes.alpha_3,capital,coordinates.latlng',
    );

    const countries = await new CountryCatalogService(config).getCountries();

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL | undefined;
    expect(requestUrl?.searchParams.get('response_fields')).toBe(
      'names.common,codes.alpha_3,capitals',
    );
    expect(countries[0]?.mapAnchor).toEqual([-75.7, 45.42]);
  });

  it('requests map coordinates from a proxied v5 endpoint without a field list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            name: { common: 'Canada' },
            cca3: 'CAN',
            latlng: [56, -106],
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const config = createConfig('https://countries.example.test/v5/all');

    await new CountryCatalogService(config).getCountries();
    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL | undefined;
    expect(requestUrl?.searchParams.get('response_fields')).toBe(
      'names.common,names.official,codes.alpha_2,codes.alpha_3,codes.numeric,capitals,region,subregion,flag.emoji',
    );
  });

  it('requests legacy map coordinates from REST Countries v3 endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            name: { common: 'Canada' },
            cca3: 'CAN',
            latlng: [56, -106],
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const config = createConfig(
      'https://restcountries.com/v3.1/all?fields=name,cca3',
    );

    const countries = await new CountryCatalogService(config).getCountries();

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL | undefined;
    expect(requestUrl?.searchParams.get('fields')).toBe('name,cca3,latlng');
    expect(countries[0]?.mapAnchor).toEqual([-106, 56]);
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

  it('excludes territories without map geometry and accepts unpadded numeric codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              objects: [
                {
                  names: { common: 'Afghanistan' },
                  codes: { alpha_2: 'AF', alpha_3: 'AFG', numeric: 4 },
                  capitals: [{ name: 'Kabul', primary: true, coordinates: { lat: 34.5, lng: 69.2 } }],
                },
                {
                  names: { common: 'Bouvet Island' },
                  codes: { alpha_2: 'BV', alpha_3: 'BVT', numeric: '074' },
                  capitals: [],
                },
                {
                  names: { common: 'Réunion' },
                  codes: { alpha_2: 'RE', alpha_3: 'REU', ccn3: '638' },
                  capitals: [{ name: 'Saint-Denis' }],
                },
                {
                  names: { common: 'Kosovo' },
                  codes: { alpha_2: 'XK', alpha_3: 'UNK' },
                  capitals: [{ name: 'Pristina' }],
                },
              ],
              meta: { limit: 25, offset: 0, more: false },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const countries = await new CountryCatalogService(createConfig()).getCountries();
    expect(countries.map((country) => country.cca3)).toEqual(['AFG']);
  });

  it('keeps WORLD_MAP_NUMERIC_IDS synced with web-client world.json when available', () => {
    const worldJsonPath = resolve(
      process.cwd(),
      '../web-client/public/data/world.json',
    );
    if (!existsSync(worldJsonPath)) return;

    const topology = JSON.parse(readFileSync(worldJsonPath, 'utf8')) as {
      objects: { countries: { geometries: Array<{ id?: string | number }> } };
    };
    const fileIds = new Set(
      topology.objects.countries.geometries
        .map((geometry) => geometry.id?.toString())
        .filter((id): id is string => id !== undefined),
    );

    expect([...WORLD_MAP_NUMERIC_IDS].sort()).toEqual([...fileIds].sort());
  });
});
