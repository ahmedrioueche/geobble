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
    roomPlayingInactivityMs: 90_000,
    roomWaitingInactivityMs: 300_000,
    playerIdleToSpectatorMs: 45_000,
    spectatorPromptDelayMs: 180_000,
    spectatorPromptGraceMs: 30_000,
    roundAdvanceDelayMs: 0,
    checkpointDurationMs: 10_000,
    settingsVoteDurationMs: 25_000,
    settingsVoteCooldownMs: 20_000,
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

  it('creates a lobby, requires two connected players, starts a match, and awards the first correct player', async () => {
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
    await expect(
      lifecycle.startRoom(host.snapshot.roomId, host.playerId),
    ).rejects.toMatchObject({ code: 'ROOM_NOT_STARTABLE' });

    await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
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
    await lifecycle.joinRoom({
      requestId: 'request-join-timed',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
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
    await lifecycle.joinRoom({
      requestId: 'request-join',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
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
      secret: host.roomSecret,
    });
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
      secret: host.roomSecret,
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
    await lifecycle.joinRoom({
      requestId: 'request-join-powerups',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
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
      secret: host.roomSecret,
    });
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

  it('allows players to join or re-join an already playing room at any time via code or public matchmaking', async () => {
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
      requestId: 'request-create-live-join',
      playerName: 'Ada',
      visibility: 'public',
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join-live-1',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    await lifecycle.startRoom(host.snapshot.roomId, host.playerId);

    // Grace leaves during the active match and then re-joins using the room code
    await lifecycle.leaveRoom(host.snapshot.roomId, guest.playerId);
    const rejoined = await lifecycle.joinRoom({
      requestId: 'request-rejoin-by-code',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });
    expect(rejoined.snapshot.status).toBe('playing');
    expect(rejoined.snapshot.players).toHaveLength(2);

    // Another player joins the in-progress public room via public matchmaking
    const publicJoiner = await lifecycle.joinPublicRoom({
      requestId: 'request-public-midgame',
      playerName: 'Linus',
    });
    expect(publicJoiner.snapshot.roomId).toBe(host.snapshot.roomId);
    expect(publicJoiner.snapshot.status).toBe('playing');
    expect(publicJoiner.snapshot.players).toHaveLength(3);

    // The newly joined player can immediately answer the active round
    const stored = await repository.findById(host.snapshot.roomId);
    const targetCode = stored?.game.round?.targetCountryCode ?? 'CAN';
    const answerOutcome = await gameplay.submitCommand(
      host.snapshot.roomId,
      publicJoiner.playerId,
      {
        type: 'answer',
        answerCountryCode: targetCode,
        commandId: 1,
        expectedRevision: publicJoiner.snapshot.revision,
        missionId: publicJoiner.snapshot.game.round?.missionId ?? '',
      },
    );
    expect(answerOutcome).toMatchObject({
      accepted: true,
      answerResult: true,
    });
  });

  it('auto-moves idle active players to spectator, prompts them after 180s, kicks unresponsive spectators, and closes inactive rooms after 90s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({
      roundTimeLimitMs: 20_000,
      playerIdleToSpectatorMs: 45_000,
      spectatorPromptDelayMs: 180_000,
      spectatorPromptGraceMs: 30_000,
      roomPlayingInactivityMs: 90_000,
    });
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
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );

    const host = await lifecycle.createRoom({
      requestId: 'request-create-inactivity',
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
      requestId: 'request-join-inactivity',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
    await lifecycle.startRoom(host.snapshot.roomId, host.playerId);

    const t0 = Date.now();

    // Host stays active at t0 + 40s, while guest has been idle for 46s -> guest becomes spectator
    await lifecycle.changeSettings(host.snapshot.roomId, host.playerId, {
      ...host.snapshot.config,
    });
    const storedBeforeIdle = await repository.findById(host.snapshot.roomId);
    if (storedBeforeIdle) {
      const guestRecord = storedBeforeIdle.players.find(
        (p) => p.playerId === guest.playerId,
      );
      if (guestRecord) guestRecord.lastActiveAt = t0 - 46_000;
      await repository.compareAndSwap(
        host.snapshot.roomId,
        storedBeforeIdle.revision,
        storedBeforeIdle,
      );
    }

    const idleTick = await runtime.tick(t0);
    const afterAutoSpectator = idleTick.snapshots.find(
      (s) => s.roomId === host.snapshot.roomId,
    );
    expect(
      afterAutoSpectator?.players.find((p) => p.id === guest.playerId)?.paused,
    ).toBe(true);

    // 180s later while host keeps the room active, guest receives the spectator confirmation prompt
    const storedBeforePrompt = await repository.findById(host.snapshot.roomId);
    const tPrompt = t0 + 181_000;
    if (storedBeforePrompt) {
      storedBeforePrompt.lastActivityAt = tPrompt - 10_000;
      const hostRecord = storedBeforePrompt.players.find(
        (p) => p.playerId === host.playerId,
      );
      if (hostRecord) hostRecord.lastActiveAt = tPrompt - 10_000;
      await repository.compareAndSwap(
        host.snapshot.roomId,
        storedBeforePrompt.revision,
        storedBeforePrompt,
      );
    }

    const promptTick = await runtime.tick(tPrompt);
    const promptSnapshot = promptTick.snapshots.find(
      (s) => s.roomId === host.snapshot.roomId,
    );
    const guestWithPrompt = promptSnapshot?.players.find(
      (p) => p.id === guest.playerId,
    );
    expect(guestWithPrompt?.spectatorPromptDeadlineAt).toBe(tPrompt + 30_000);

    // Guest does not click "Still watching" within 30s -> guest is kicked out
    const tKick = tPrompt + 31_000;
    const storedBeforeKick = await repository.findById(host.snapshot.roomId);
    if (storedBeforeKick) {
      storedBeforeKick.lastActivityAt = tKick - 5_000;
      const hostRecord = storedBeforeKick.players.find(
        (p) => p.playerId === host.playerId,
      );
      if (hostRecord) hostRecord.lastActiveAt = tKick - 5_000;
      await repository.compareAndSwap(
        host.snapshot.roomId,
        storedBeforeKick.revision,
        storedBeforeKick,
      );
    }

    const kickTick = await runtime.tick(tKick);
    expect(kickTick.kickedPlayers).toEqual([
      {
        roomId: host.snapshot.roomId,
        playerId: guest.playerId,
        reason: 'inactivity',
      },
    ]);
    expect(
      kickTick.snapshots[0]?.players.map((player) => player.id),
    ).toEqual([host.playerId]);

    // When no player in the room has any activity for 90s, the entire room is closed and deleted
    const roomCloseTick = await runtime.tick(tKick + 95_000);
    expect(roomCloseTick.removedRoomIds).toContain(host.snapshot.roomId);
    expect(roomCloseTick.closedRooms).toContainEqual({
      roomId: host.snapshot.roomId,
      reason: 'inactivity',
    });
    expect(await repository.findById(host.snapshot.roomId)).toBeNull();
  });

  it('enforces room secrets on private rooms, supports inspection, and admits public rooms without a secret', async () => {
    const config = createConfig();
    const repository = new InMemoryRoomRepository();
    const lifecycle = new RoomLifecycleService(
      repository,
      new RoomMutationService(repository, config),
      new CountryCatalogService(config),
      new GameEngineService(),
      config,
    );

    const privateRoom = await lifecycle.createRoom({
      requestId: 'request-create-private',
      playerName: 'Ada',
      visibility: 'private',
      secret: 'GeoSecret',
    });
    expect(privateRoom.roomSecret).toBe('GeoSecret');
    expect(JSON.stringify(privateRoom.snapshot)).not.toContain('GeoSecret');

    await expect(
      lifecycle.inspectRoom(privateRoom.snapshot.roomId),
    ).resolves.toEqual({
      roomId: privateRoom.snapshot.roomId,
      visibility: 'private',
      status: 'waiting',
      playerCount: 1,
      maxPlayers: 8,
      requiresSecret: true,
    });

    await expect(
      lifecycle.joinRoom({
        requestId: 'request-join-missing-secret',
        roomId: privateRoom.snapshot.roomId,
        playerName: 'Grace',
      }),
    ).rejects.toMatchObject({ code: 'SECRET_REQUIRED' });

    await expect(
      lifecycle.joinRoom({
        requestId: 'request-join-wrong-secret',
        roomId: privateRoom.snapshot.roomId,
        playerName: 'Grace',
        secret: 'wrongpass',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SECRET' });

    const joinedPrivate = await lifecycle.joinRoom({
      requestId: 'request-join-valid-secret',
      roomId: privateRoom.snapshot.roomId,
      playerName: 'Grace',
      secret: 'geosecret',
    });
    expect(joinedPrivate.roomSecret).toBe('GeoSecret');

    const autoSecretRoom = await lifecycle.createRoom({
      requestId: 'request-create-auto-secret',
      playerName: 'Linus',
      visibility: 'private',
    });
    expect(autoSecretRoom.roomSecret).toMatch(/^[A-Z2-9]{6}$/);

    const publicRoom = await lifecycle.createRoom({
      requestId: 'request-create-public',
      playerName: 'Alan',
      visibility: 'public',
    });
    expect(publicRoom.roomSecret).toBeUndefined();
    await expect(
      lifecycle.inspectRoom(publicRoom.snapshot.roomId),
    ).resolves.toMatchObject({
      visibility: 'public',
      requiresSecret: false,
    });

    const joinedPublic = await lifecycle.joinRoom({
      requestId: 'request-join-public',
      roomId: publicRoom.snapshot.roomId,
      playerName: 'Grace',
    });
    expect(joinedPublic.roomSecret).toBeUndefined();

    await expect(lifecycle.inspectRoom('999999')).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
    });
  });

  it('supports finishing a match, updating settings, excluding finished rooms from matchmaking, and starting a rematch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({ roundAdvanceDelayMs: 0, roundTimeLimitMs: 0 });
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
      requestId: 'request-create-rematch',
      playerName: 'Ada',
      visibility: 'public',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'count',
        challengeValue: 1,
        endless: false,
        roundTimeLimitSeconds: 0,
      },
    });
    const guest = await lifecycle.joinRoom({
      requestId: 'request-join-rematch',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
    });

    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const stored = await repository.findById(host.snapshot.roomId);
    const targetCode = stored?.game.round?.targetCountryCode ?? 'CAN';
    await gameplay.submitCommand(host.snapshot.roomId, host.playerId, {
      type: 'answer',
      answerCountryCode: targetCode,
      commandId: 1,
      expectedRevision: started.revision,
      missionId: started.game.round?.missionId ?? '',
    });

    const finishedTick = await runtime.tick(Date.now() + 1);
    const finishedSnapshot = finishedTick.snapshots.find(
      (item) => item.roomId === host.snapshot.roomId,
    );
    expect(finishedSnapshot?.status).toBe('finished');
    expect(
      finishedSnapshot?.players.find((player) => player.id === host.playerId)
        ?.score,
    ).toBe(10);

    // Public matchmaking does not drop new players into an ended match
    const matchmade = await lifecycle.joinPublicRoom({
      requestId: 'request-public-after-finish',
      playerName: 'Linus',
    });
    expect(matchmade.snapshot.roomId).not.toBe(host.snapshot.roomId);

    // Host can change settings immediately while finished
    const updatedSettings = await lifecycle.changeSettings(
      host.snapshot.roomId,
      host.playerId,
      {
        mode: 'reverse',
        pinDirection: 'locate',
        subMode: 'capital',
        challengeType: 'count',
        challengeValue: 3,
        roundTimeLimitSeconds: 15,
      },
    );
    expect(updatedSettings.queued).toBe(false);
    expect(updatedSettings.snapshot.config).toMatchObject({
      mode: 'reverse',
      subMode: 'capital',
      challengeValue: 3,
    });

    // Requires >= 2 connected players to start rematch
    await lifecycle.markDisconnected(host.snapshot.roomId, guest.playerId);
    await expect(
      lifecycle.startRoom(host.snapshot.roomId, host.playerId),
    ).rejects.toMatchObject({ code: 'ROOM_NOT_STARTABLE' });

    await lifecycle.reconnect({
      requestId: 'request-reconnect-rematch',
      roomId: host.snapshot.roomId,
      playerId: guest.playerId,
      reconnectToken: guest.reconnectToken,
    });

    const rematch = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    expect(rematch.status).toBe('playing');
    expect(rematch.config.mode).toBe('reverse');
    expect(rematch.game.round?.number).toBe(1);
    expect(rematch.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: host.playerId,
          score: 0,
          streak: 0,
          maxStreak: 0,
          answered: false,
          powerUps: { fifty: true, hint: true, double: true, freeze: true },
        }),
        expect.objectContaining({
          id: guest.playerId,
          score: 0,
          streak: 0,
          maxStreak: 0,
          answered: false,
          powerUps: { fifty: true, hint: true, double: true, freeze: true },
        }),
      ]),
    );
  });

  it('runs count-based endless checkpoints with crowns, power-up refills, 10s auto-advance, and escalating multipliers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({
      roundAdvanceDelayMs: 0,
      checkpointDurationMs: 10_000,
      roundTimeLimitMs: 0,
    });
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
      requestId: 'request-create-endless-count',
      playerName: 'Ada',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'count',
        challengeValue: 1,
        endless: true,
        difficulty: 'progressive',
        roundTimeLimitSeconds: 0,
      },
    });
    await lifecycle.joinRoom({
      requestId: 'request-join-endless-count',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });

    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    expect(started.game.legNumber).toBe(1);
    expect(started.game.legMultiplier).toBe(1);

    // Spend a power-up and answer correctly in Leg 1
    await gameplay.submitCommand(host.snapshot.roomId, host.playerId, {
      type: 'powerup',
      kind: 'hint',
      commandId: 1,
      expectedRevision: started.revision,
      missionId: started.game.round?.missionId ?? '',
    });
    const stored1 = await repository.findById(host.snapshot.roomId);
    const answer1 = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: stored1?.game.round?.targetCountryCode ?? 'CAN',
        commandId: 2,
        expectedRevision: (stored1?.revision ?? started.revision),
        missionId: started.game.round?.missionId ?? '',
      },
    );
    expect(answer1.accepted).toBe(true);

    // Trigger checkpoint after 1-round leg
    const tCheckpoint = Date.now() + 1;
    const checkpointTick = await runtime.tick(tCheckpoint);
    const cpSnapshot = checkpointTick.snapshots.find(
      (item) => item.roomId === host.snapshot.roomId,
    );
    expect(cpSnapshot?.status).toBe('checkpoint');
    expect(cpSnapshot?.game.checkpointSummary).toMatchObject({
      legNumber: 1,
      winnerIds: [host.playerId],
      topLegScore: 10,
      nextLegNumber: 2,
      nextLegTier: 'medium',
      nextLegMultiplier: 1.25,
    });
    expect(
      cpSnapshot?.players.find((player) => player.id === host.playerId),
    ).toMatchObject({
      score: 10,
      legScore: 10,
      checkpointsWon: 1,
    });

    // Before 10s elapses, room stays in checkpoint
    const midTick = await runtime.tick((cpSnapshot?.game.checkpointResumeAt ?? tCheckpoint) - 100);
    expect(midTick.snapshots).toHaveLength(0);

    // At 10s, Leg 2 auto-starts with legScore reset, total score kept, 1.25x multiplier, and power-ups refilled
    const leg2Tick = await runtime.tick(
      (cpSnapshot?.game.checkpointResumeAt ?? tCheckpoint) + 1,
    );
    const leg2Snapshot = leg2Tick.snapshots.find(
      (item) => item.roomId === host.snapshot.roomId,
    );
    expect(leg2Snapshot?.status).toBe('playing');
    expect(leg2Snapshot?.game.legNumber).toBe(2);
    expect(leg2Snapshot?.game.legMultiplier).toBe(1.25);
    expect(leg2Snapshot?.game.legTier).toBe('medium');
    expect(leg2Snapshot?.game.round?.number).toBe(2);
    const hostLeg2 = leg2Snapshot?.players.find(
      (player) => player.id === host.playerId,
    );
    expect(hostLeg2).toMatchObject({
      score: 10,
      legScore: 0,
      checkpointsWon: 1,
      powerUps: { fifty: true, hint: true, double: true, freeze: true },
    });

    // Answering in Leg 2 earns 1.25x (Math.round(10 * 1.25) = 13, wait streak=1 -> 10 + 5 = 15 * 1.25 = 19)
    const stored2 = await repository.findById(host.snapshot.roomId);
    const answer2 = await gameplay.submitCommand(
      host.snapshot.roomId,
      host.playerId,
      {
        type: 'answer',
        answerCountryCode: stored2?.game.round?.targetCountryCode ?? 'FRA',
        commandId: 3,
        expectedRevision: leg2Snapshot?.revision ?? 0,
        missionId: leg2Snapshot?.game.round?.missionId ?? '',
      },
    );
    expect(answer2.accepted).toBe(true);
    const hostAfterLeg2 = answer2.snapshot.players.find(
      (player) => player.id === host.playerId,
    );
    expect(hostAfterLeg2?.legScore).toBe(19);
    expect(hostAfterLeg2?.score).toBe(29);
  });

  it('supports timer-based endless checkpoints, pausing/resuming the countdown, and starting the next leg immediately', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({
      roundAdvanceDelayMs: 0,
      checkpointDurationMs: 10_000,
      roundTimeLimitMs: 0,
    });
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
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );

    const host = await lifecycle.createRoom({
      requestId: 'request-create-endless-timer',
      playerName: 'Ada',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'timer',
        challengeValue: 30,
        endless: true,
        roundTimeLimitSeconds: 0,
      },
    });
    await lifecycle.joinRoom({
      requestId: 'request-join-endless-timer',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });

    const started = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    const timerDeadline = started.game.timerDeadlineAt ?? Date.now() + 30_000;

    // Timer expires -> enters checkpoint instead of finished
    const checkpointTick = await runtime.tick(timerDeadline + 1);
    const cpSnapshot = checkpointTick.snapshots.find(
      (item) => item.roomId === host.snapshot.roomId,
    );
    expect(cpSnapshot?.status).toBe('checkpoint');
    expect(cpSnapshot?.game.checkpointResumeAt).toEqual(expect.any(Number));

    // Host pauses countdown
    const paused = await lifecycle.setPaused(
      host.snapshot.roomId,
      host.playerId,
      true,
    );
    expect(paused.game.checkpointPaused).toBe(true);
    expect(paused.game.checkpointResumeAt).toBeNull();

    // Runtime tick does not auto-advance while countdown is paused
    const whilePaused = await runtime.tick(Date.now() + 60_000);
    expect(whilePaused.snapshots).toHaveLength(0);

    // Host resumes countdown, then skips straight to Leg 2
    const resumed = await lifecycle.setPaused(
      host.snapshot.roomId,
      host.playerId,
      false,
    );
    expect(resumed.game.checkpointPaused).toBeUndefined();
    expect(resumed.game.checkpointResumeAt).toEqual(expect.any(Number));

    const leg2 = await lifecycle.startRoom(
      host.snapshot.roomId,
      host.playerId,
    );
    expect(leg2.status).toBe('playing');
    expect(leg2.game.legNumber).toBe(2);
    expect(leg2.game.timerDeadlineAt).toEqual(expect.any(Number));
  });

  it('runs majority settings votes across waiting and playing states without AFK stalls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiCountries), { status: 200 }),
      ),
    );
    const config = createConfig({
      settingsVoteDurationMs: 10_000,
      settingsVoteCooldownMs: 15_000,
    });
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
    const runtime = new RoomRuntimeService(
      repository,
      mutations,
      countries,
      engine,
      config,
    );

    const host = await lifecycle.createRoom({
      requestId: 'vote-create',
      playerName: 'Ada',
      config: {
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'count',
        challengeValue: 5,
      },
    });
    const guest1 = await lifecycle.joinRoom({
      requestId: 'vote-join-1',
      roomId: host.snapshot.roomId,
      playerName: 'Grace',
      secret: host.roomSecret,
    });
    const guest2 = await lifecycle.joinRoom({
      requestId: 'vote-join-2',
      roomId: host.snapshot.roomId,
      playerName: 'Alan',
      secret: host.roomSecret,
    });

    // Reject unchanged configuration
    await expect(
      lifecycle.proposeSettingsVote(
        host.snapshot.roomId,
        guest1.playerId,
        host.snapshot.config,
      ),
    ).rejects.toThrow('Select at least one setting to change.');

    // Guest proposes flag submode in waiting room
    const proposed = await lifecycle.proposeSettingsVote(
      host.snapshot.roomId,
      guest1.playerId,
      { ...host.snapshot.config, subMode: 'flag' },
    );
    expect(proposed.snapshot.settingsVote).toMatchObject({
      voteId: proposed.voteId,
      proposerPlayerId: guest1.playerId,
      yesPlayerIds: [guest1.playerId],
      noPlayerIds: [],
      requiredYes: 2,
      eligibleCount: 3,
    });

    // Duplicate vote rejected
    await expect(
      lifecycle.castSettingsVote(
        host.snapshot.roomId,
        guest1.playerId,
        proposed.voteId,
        true,
      ),
    ).rejects.toThrow('You have already voted on this proposal.');

    // Concurrent second proposal rejected
    await expect(
      lifecycle.proposeSettingsVote(
        host.snapshot.roomId,
        guest2.playerId,
        { ...host.snapshot.config, challengeValue: 8 },
      ),
    ).rejects.toThrow('A settings vote is already in progress.');

    // Second yes passes immediately (2 of 3) and applies in waiting room
    const passed = await lifecycle.castSettingsVote(
      host.snapshot.roomId,
      host.playerId,
      proposed.voteId,
      true,
    );
    expect(passed.voteResolved?.outcome).toBe('passed');
    expect(passed.voteResolved?.queued).toBe(false);
    expect(passed.snapshot.settingsVote).toBeUndefined();
    expect(passed.snapshot.config.subMode).toBe('flag');

    // Start match and test mid-game vote + runtime expiry + cooldown
    await lifecycle.startRoom(host.snapshot.roomId, host.playerId);
    const inGameProposal = await lifecycle.proposeSettingsVote(
      host.snapshot.roomId,
      guest2.playerId,
      { ...passed.snapshot.config, subMode: 'capital' },
    );
    expect(inGameProposal.snapshot.settingsVote?.voteId).toBe(
      inGameProposal.voteId,
    );

    const expireAt = inGameProposal.snapshot.settingsVote!.expiresAt;
    const expiredTick = await runtime.tick(expireAt + 1);
    expect(expiredTick.resolvedVotes).toEqual([
      expect.objectContaining({
        roomId: host.snapshot.roomId,
        voteId: inGameProposal.voteId,
        outcome: 'expired',
      }),
    ]);

    // Cooldown prevents immediate re-proposal by Alan
    await expect(
      lifecycle.proposeSettingsVote(
        host.snapshot.roomId,
        guest2.playerId,
        { ...passed.snapshot.config, subMode: 'name' },
      ),
    ).rejects.toThrow('Please wait a moment before proposing another change.');

    // Grace proposes, Host goes AFK -> quorum shrinks to 2 -> Alan's yes passes & queues pendingConfig
    const playingVote = await lifecycle.proposeSettingsVote(
      host.snapshot.roomId,
      guest1.playerId,
      { ...passed.snapshot.config, subMode: 'capital' },
    );
    await lifecycle.setPaused(host.snapshot.roomId, host.playerId, true);
    const resolvedByActive = await lifecycle.castSettingsVote(
      host.snapshot.roomId,
      guest2.playerId,
      playingVote.voteId,
      true,
    );
    expect(resolvedByActive.voteResolved?.outcome).toBe('passed');
    expect(resolvedByActive.voteResolved?.queued).toBe(true);
    expect(resolvedByActive.snapshot.pendingConfig?.subMode).toBe('capital');
  });
});
