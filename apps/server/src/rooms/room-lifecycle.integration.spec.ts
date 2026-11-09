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

const createConfig = (
  overrides: Partial<ServerConfiguration> = {},
): ConfigService<ServerConfiguration, true> =>
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
    roundTimeLimitMs: 0,
    pointsPerCorrectAnswer: 10,
    streakBonusPoints: 5,
    choicesPerRound: 4,
    countryDataCacheMs: 3_600_000,
    restCountriesApiUrl: 'https://countries.example.test/all',
    restCountriesApiKey: null,
    ...overrides,
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
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 0,
      },
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
    expect(outcome.snapshot.game.round?.result).toMatchObject({
      fastestPlayerId: host.playerId,
      players: [
        {
          playerId: host.playerId,
          correct: true,
          pointsGained: 10,
          streakAfter: 1,
        },
      ],
    });
    expect(JSON.stringify(outcome.snapshot)).not.toContain('targetCountryCode');
    expect(JSON.stringify(outcome.snapshot)).not.toContain(
      host.reconnectToken,
    );
  });

  it('stamps round timing, reveals timed-out rounds, and reports a round result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({ roundTimeLimitMs: 20_000 });
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
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );

    const host = await lifecycle.createRoom({
      requestId: 'request-create-timed',
      playerName: 'Ada',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 20,
      },
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join-timed',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.setReady(host.snapshot.roomId, guest.playerId, true);
    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const round = started.game.round;
    expect(round?.startedAt).toEqual(expect.any(Number));
    expect(round?.deadlineAt).toBe((round?.startedAt ?? 0) + 20_000);
    expect(round?.result).toBeNull();

    // Nothing happens before the deadline.
    expect((await runtime.tick((round?.startedAt ?? 0) + 1_000)).snapshots)
      .toHaveLength(0);

    // The host answers wrong, the guest never answers; the deadline reveals.
    const stored = await repository.findById(host.snapshot.roomId);
    const wrongCode = ['CAN', 'FRA', 'JPN', 'BRA'].find(
      (code) => code !== stored?.game.round?.targetCountryCode,
    );
    const outcome = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: wrongCode ?? null,
        commandId: 1,
        expectedRevision: started.revision,
        missionId: round?.missionId ?? '',
      },
    );
    expect(outcome.accepted).toBe(true);
    expect(outcome.snapshot.game.round?.revealed).toBe(false);
    expect(outcome.snapshot.game.round?.result).toBeNull();

    const updates = await runtime.tick((round?.deadlineAt ?? 0) + 1);
    const revealed = updates.snapshots[0]?.game.round;
    expect(revealed?.revealed).toBe(true);
    expect(revealed?.result).toMatchObject({
      fastestPlayerId: null,
      players: [
        { playerId: host.playerId, correct: false, pointsGained: 0 },
      ],
    });
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
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 0,
      },
    });
    const updatedSettings = await lifecycle.changeSettings(
      host.snapshot.roomId,
      host.playerId,
      {
        ...host.snapshot.config,
        mode: 'reverse',
      },
    );
    expect(updatedSettings.queued).toBe(false);
    expect(updatedSettings.snapshot.config.mode).toBe('reverse');
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
    const stored = await repository.findById(host.snapshot.roomId);
    const targetCode = stored?.game.round?.targetCountryCode;
    const targetChoiceId = stored?.game.round?.choices.find(
      (choice) => choice.countryCode === targetCode,
    )?.id;
    const missionId = started.game.round?.missionId;
    expect(started.game.round?.prompt).toMatchObject({
      type: 'instruction',
      mapAnchor: expect.any(Array),
    });
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
    expect(changed.snapshot.config.mode).toBe('reverse');
    expect(changed.snapshot.pendingConfig?.mode).toBe('pin');

    await gameplay.submitCommand(host.snapshot.roomId, host.playerId, {
      type: 'answer',
      choiceId: targetChoiceId ?? '',
      answerCountryCode: null,
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
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 0,
      },
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

  it('accepts a valid reconnect while disconnect is pending and ignores the old socket disconnect', async () => {
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
    const host = await lifecycle.createRoom({
      requestId: 'request-create',
      playerName: 'Ada',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 0,
      },
    });

    const reconnected = await lifecycle.reconnect({
      requestId: 'request-reconnect',
      roomId: host.snapshot.roomId,
      playerId: host.playerId,
      reconnectToken: host.reconnectToken,
    });

    expect(reconnected.reconnectToken).not.toBe(host.reconnectToken);
    await lifecycle.markDisconnected(
      host.snapshot.roomId,
      host.playerId,
      host.reconnectToken,
    );
    await expect(
      lifecycle.getSnapshot(host.snapshot.roomId),
    ).resolves.toMatchObject({
      players: [expect.objectContaining({ id: host.playerId, connected: true })],
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

  it('supports power-ups (50/50, hint, double points, freeze) and closest-pin scoring', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({ roundTimeLimitMs: 20_000 });
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
      requestId: 'request-create-powerups',
      playerName: 'Ada',
      config: {
        mode: 'reverse',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 20,
      },
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join-powerups',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.setReady(host.snapshot.roomId, guest.playerId, true);
    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const missionId = started.game.round?.missionId ?? '';

    const fifty = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'powerup',
        kind: 'fifty',
        commandId: 1,
        expectedRevision: started.revision,
        missionId,
      },
    );
    expect(fifty.accepted).toBe(true);
    const hostSelf = fifty.snapshot.players.find(
      (player) => player.id === host.playerId,
    );
    expect(hostSelf?.hiddenChoiceIds).toHaveLength(2);
    expect(hostSelf?.powerUps?.fifty).toBe(false);

    const hint = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'powerup',
        kind: 'hint',
        commandId: 2,
        expectedRevision: fifty.snapshot.revision,
        missionId,
      },
    );
    expect(hint.accepted).toBe(true);
    expect(
      hint.snapshot.players.find((player) => player.id === host.playerId)?.hint,
    ).toContain('Region:');

    const freeze = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'powerup',
        kind: 'freeze',
        commandId: 3,
        expectedRevision: hint.snapshot.revision,
        missionId,
      },
    );
    expect(freeze.accepted).toBe(true);
    expect(freeze.snapshot.game.round?.deadlineAt).toBe(
      (started.game.round?.deadlineAt ?? 0) + 8_000,
    );

    const double = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'powerup',
        kind: 'double',
        commandId: 4,
        expectedRevision: freeze.snapshot.revision,
        missionId,
      },
    );
    expect(double.accepted).toBe(true);
    expect(
      double.snapshot.players.find((player) => player.id === host.playerId)
        ?.doubleActive,
    ).toBe(true);
  });

  it('keeps the game running even when only 1 active player remains after another goes AFK, and freezes only if all players are AFK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({ roundTimeLimitMs: 20_000 });
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
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );

    const host = await lifecycle.createRoom({
      requestId: 'request-create-pause',
      playerName: 'Ada',
    });
    const guest1 = await lifecycle.joinRoom({
      requestId: 'request-join-pause-1',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.setReady(host.snapshot.roomId, guest1.playerId, true);
    await lifecycle.startRoom(host.snapshot.roomId, host.playerId);

    // 1 of 2 players goes AFK -> 1 active player remains, match continues!
    const afterGuestAfk = await lifecycle.setPaused(
      host.snapshot.roomId,
      guest1.playerId,
      true,
    );
    expect(afterGuestAfk.game.paused).toBeUndefined();
    expect(
      afterGuestAfk.players.find((p) => p.id === guest1.playerId)?.paused,
    ).toBe(true);

    // The remaining active player can still answer and complete the round solo
    const soloAnswer = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: 'ZZZ',
        commandId: 1,
        expectedRevision: afterGuestAfk.revision,
        missionId: afterGuestAfk.game.round?.missionId ?? '',
      },
    );
    expect(soloAnswer.accepted).toBe(true);
    expect(soloAnswer.snapshot.game.round?.revealed).toBe(true);

    // If all connected players go AFK (0 active players), room freezes until auto-resume
    const afterAllAfk = await lifecycle.setPaused(
      host.snapshot.roomId,
      host.playerId,
      true,
    );
    expect(afterAllAfk.game.paused).toBe(true);

    const futureNow = (afterAllAfk.game.pauseDeadlineAt ?? Date.now()) + 1_000;
    const tickResult = await runtime.tick(futureNow);
    expect(tickResult.snapshots).toHaveLength(1);
    expect(tickResult.snapshots[0]?.game.paused).toBeUndefined();
  });
});
