import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerConfiguration } from '../config/server-configuration.js';
import { CountryCatalogService } from '../game/country-catalog.service.js';
import { GameEngineService } from '../game/game-engine.service.js';
import { RoomGameplayService } from './room-gameplay.service.js';
import { RoomLifecycleService } from './room-lifecycle.service.js';
import { RoomMutationService } from './room-mutation.service.js';
import { RoomRuntimeService } from './room-runtime.service.js';
import { InMemoryRoomRepository } from '../../test/support/in-memory-room.repository.js';

const apiCountries: Array<Record<string, unknown>> = [
  {
    name: { common: 'Canada' },
    cca2: 'CA',
    cca3: 'CAN',
    ccn3: '124',
    capital: ['Ottawa'],
    region: 'Americas',
    subregion: 'North America',
    flag: '🇨🇦',
    latlng: [56, -106],
  },
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
  {
    name: { common: 'Japan' },
    cca2: 'JP',
    cca3: 'JPN',
    ccn3: '392',
    capital: ['Tokyo'],
    region: 'Asia',
    subregion: 'Eastern Asia',
    flag: '🇯🇵',
    latlng: [36, 138],
  },
  {
    name: { common: 'Brazil' },
    cca2: 'BR',
    cca3: 'BRA',
    ccn3: '076',
    capital: ['Brasilia'],
    region: 'Americas',
    subregion: 'South America',
    flag: '🇧🇷',
    latlng: [-10, -55],
  },
];

const createConfig = (): ConfigService<ServerConfiguration, true> =>
  new ConfigService<ServerConfiguration, true>({
    port: 3000,
    mongoUri: 'mongodb://localhost/test',
    clientOrigins: ['http://localhost:5173'],
    roomMaxPlayers: 8,
    roomIdLength: 4,
    socketEventsPerMinute: 120,
    maxChallengeValue: 500,
    reconnectGraceMs: 60_000,
    roomExpiryHours: 24,
    roundAdvanceDelayMs: 0,
    pointsPerCorrectAnswer: 10,
    streakBonusPoints: 5,
    choicesPerRound: 4,
    countryDataCacheMs: 3_600_000,
    restCountriesApiUrl: 'https://countries.example.test/all',
    restCountriesApiKey: null,
  });

describe('room lifecycle and competitive gameplay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a lobby, requires readiness, starts a match, and awards the first correct player', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const mutations = new RoomMutationService(repository, config);
    const countries = new CountryCatalogService(config);
    const engine = new GameEngineService();
    const lifecycle = new RoomLifecycleService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const gameplay = new RoomGameplayService(repository, mutations, config);

    const host = await lifecycle.createRoom({
      requestId: 'request-create',
      playerName: 'Ada',
    });
    expect(host.snapshot.roomId).toMatch(/^\d{4}$/);
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await expect(
      lifecycle.startRoom(host.snapshot.roomId, host.playerId),
    ).rejects.toMatchObject({ code: 'ROOM_NOT_STARTABLE' });

    await lifecycle.setReady(host.snapshot.roomId, guest.playerId, true);
    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const stored = await repository.findById(host.snapshot.roomId);
    const targetCode = stored?.game.round?.targetCountryCode;
    const missionId = started.game.round?.missionId;
    expect(targetCode).toBeTruthy();
    expect(missionId).toBeTruthy();

    const outcome = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: targetCode ?? null,
        commandId: 1,
        expectedRevision: started.revision,
        missionId: missionId ?? '',
      },
    );

    expect(outcome.accepted).toBe(true);
    expect(outcome.snapshot.players.find((player) => player.id === host.playerId))
      .toMatchObject({ score: 10, streak: 1, answered: true });
    expect(outcome.snapshot.game.round?.revealed).toBe(true);
    expect(JSON.stringify(outcome.snapshot)).not.toContain('targetCountryCode');
    expect(JSON.stringify(outcome.snapshot)).not.toContain(
      host.reconnectToken,
    );
  });

  it('supports queued live mode changes, then applies them when the next round starts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const mutations = new RoomMutationService(repository, config);
    const countries = new CountryCatalogService(config);
    const engine = new GameEngineService();
    const lifecycle = new RoomLifecycleService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const gameplay = new RoomGameplayService(repository, mutations, config);

    const host = await lifecycle.createRoom({
      requestId: 'request-create',
      playerName: 'Ada',
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.setReady(host.snapshot.roomId, guest.playerId, true);
    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const targetCode = (await repository.findById(host.snapshot.roomId))
      ?.game.round?.targetCountryCode;
    const missionId = started.game.round?.missionId;
    const changed = await lifecycle.changeSettings(
      host.snapshot.roomId,
      host.playerId,
      {
        mode: 'pin',
        pinDirection: 'locate',
        subMode: 'capital',
        challengeType: 'world',
        challengeValue: 0,
      },
    );
    expect(changed.queued).toBe(true);
    expect(changed.snapshot.config.mode).toBe('identify');
    expect(changed.snapshot.pendingConfig?.mode).toBe('pin');

    await gameplay.submitCommand(host.snapshot.roomId, host.playerId, {
      type: 'answer',
      answerCountryCode: targetCode ?? null,
      commandId: 1,
      expectedRevision: changed.snapshot.revision,
      missionId: missionId ?? '',
    });

    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const updates = await runtime.tick(Date.now() + 1);
    expect(updates.snapshots[0]?.config).toMatchObject({
      mode: 'pin',
      pinDirection: 'locate',
      subMode: 'capital',
    });
    expect(updates.snapshots[0]?.pendingConfig).toBeNull();
  });

  it('accepts pin guesses and keeps them hidden until the round is revealed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const mutations = new RoomMutationService(repository, config);
    const countries = new CountryCatalogService(config);
    const engine = new GameEngineService();
    const lifecycle = new RoomLifecycleService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const gameplay = new RoomGameplayService(repository, mutations, config);

    const host = await lifecycle.createRoom({
      requestId: 'request-create',
      playerName: 'Ada',
      config: {
        mode: 'pin',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
      },
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.setReady(host.snapshot.roomId, guest.playerId, true);
    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const targetCode = (await repository.findById(host.snapshot.roomId))
      ?.game.round?.targetCountryCode;
    const wrongCode = targetCode === 'CAN' ? 'FRA' : 'CAN';
    const missionId = started.game.round?.missionId;

    const missingPin = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: wrongCode ?? null,
        commandId: 1,
        expectedRevision: started.revision,
        missionId: missionId ?? '',
      },
    );
    expect(missingPin).toMatchObject({
      accepted: false,
      reason: 'invalid-command',
    });

    const hostAnswer = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: wrongCode ?? null,
        pinLocation: [-100, 50],
        commandId: 1,
        expectedRevision: started.revision,
        missionId: missionId ?? '',
      },
    );
    expect(hostAnswer.accepted).toBe(true);
    expect(hostAnswer.snapshot.game.round?.revealed).toBe(false);
    expect(hostAnswer.snapshot.players[0]?.pinLocation).toBeNull();

    const guestAnswer = await gameplay.submitCommand(
      host.snapshot.roomId,
      guest.playerId,
      {
        type: 'answer',
        answerCountryCode: targetCode ?? null,
        pinLocation: [-106, 56],
        commandId: 1,
        expectedRevision: hostAnswer.snapshot.revision,
        missionId: missionId ?? '',
      },
    );
    expect(guestAnswer.accepted).toBe(true);
    expect(guestAnswer.snapshot.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: host.playerId,
          pinLocation: [-100, 50],
        }),
        expect.objectContaining({
          id: guest.playerId,
          pinLocation: [-106, 56],
        }),
      ]),
    );
  });

  it('rotates reconnect credentials and hands admin to a connected player after the grace period', async () => {
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const mutations = new RoomMutationService(repository, config);
    const countries = new CountryCatalogService(config);
    const engine = new GameEngineService();
    const lifecycle = new RoomLifecycleService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const host = await lifecycle.createRoom({
      requestId: 'request-create',
      playerName: 'Ada',
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });

    await lifecycle.markDisconnected(host.snapshot.roomId, host.playerId);
    const reconnected = await lifecycle.reconnect({
      requestId: 'request-reconnect',
      roomId: host.snapshot.roomId,
      playerId: host.playerId,
      reconnectToken: host.reconnectToken,
    });
    expect(reconnected.reconnectToken).not.toBe(host.reconnectToken);
    await expect(
      lifecycle.reconnect({
        requestId: 'request-replay',
        roomId: host.snapshot.roomId,
        playerId: host.playerId,
        reconnectToken: host.reconnectToken,
      }),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' });

    await lifecycle.markDisconnected(host.snapshot.roomId, host.playerId);
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );
    const updates = await runtime.tick(
      Date.now() + config.getOrThrow('reconnectGraceMs') + 1,
    );

    expect(updates.snapshots[0]).toMatchObject({
      adminPlayerId: guest.playerId,
      players: [{ id: guest.playerId, isAdmin: true }],
    });
  });

  it('creates a public room when matchmaking has no match and reuses it for the next player', async () => {
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const mutations = new RoomMutationService(repository, config);
    const lifecycle = new RoomLifecycleService(
      repository,
      mutations,
      new CountryCatalogService(config),
      new GameEngineService(),
      config,
    );
    const privateRoom = await lifecycle.createRoom({
      requestId: 'request-private',
      playerName: 'Private host',
      visibility: 'private',
    });

    const first = await lifecycle.joinPublicRoom({
      requestId: 'request-match-1',
      playerName: 'Ada',
    });
    expect(first.snapshot.roomId).not.toBe(privateRoom.snapshot.roomId);
    expect(first.snapshot.visibility).toBe('public');

    const second = await lifecycle.joinPublicRoom({
      requestId: 'request-match-2',
      playerName: 'Grace',
    });
    expect(second.snapshot.roomId).toBe(first.snapshot.roomId);
    expect(second.snapshot.players).toHaveLength(2);
  });

  it('increases numeric room-code length after repeated collisions', async () => {
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const persistRoom = repository.create.bind(repository);
    vi.spyOn(repository, 'create').mockImplementation(async (room) => {
      if (room.roomId.length === 4) {
        throw Object.assign(new Error('Duplicate room code'), { code: 11000 });
      }
      await persistRoom(room);
    });
    const lifecycle = new RoomLifecycleService(
      repository,
      new RoomMutationService(repository, config),
      new CountryCatalogService(config),
      new GameEngineService(),
      config,
    );

    const created = await lifecycle.createRoom({
      requestId: 'request-create-after-collision',
      playerName: 'Ada',
    });

    expect(created.snapshot.roomId).toMatch(/^\d{5}$/);
  });
});
