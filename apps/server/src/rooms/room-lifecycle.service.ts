import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerConfiguration } from '../config/server-configuration.js';
import { CountryCatalogService } from '../game/country-catalog.service.js';
import { GameEngineService } from '../game/game-engine.service.js';
import {
  DEFAULT_PLAYER_POWER_UPS,
  DEFAULT_ROOM_CONFIGURATION,
  type RoomConfiguration,
  type RoomCreateRequest,
  type RoomInspectResult,
  type RoomJoinRequest,
  type RoomPlayerRecord,
  type RoomReconnectRequest,
  type RoomRecord,
  type RoomSnapshot,
} from './domain/room.types.js';
import { RoomDomainError } from './domain/room-errors.js';
import {
  ROOM_REPOSITORY,
  type RoomRepository,
} from './domain/room-repository.js';
import { toRoomSnapshot } from './domain/room-snapshot.js';
import {
  parseRoomConfiguration,
  parsePlayerName,
} from './domain/room-validation.js';
import {
  areConnectedPlayersDone,
  getNextAdminPlayerId,
  resolveRoundTimeLimitMs,
  revealRoomRound,
  stampRoundTiming,
  syncRoomPauseState,
} from './domain/room-rules.js';
import { RoomMutationService } from './room-mutation.service.js';

const SECRET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createRoomId = (length: number): string =>
  Array.from({ length }, () => String(randomInt(10))).join('');

const createRoomSecret = (length = 6): string =>
  Array.from(
    { length },
    () => SECRET_ALPHABET[randomInt(SECRET_ALPHABET.length)]!,
  ).join('');

const createReconnectToken = (): string =>
  randomBytes(32).toString('base64url');

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const hashSecret = (secret: string): string =>
  createHash('sha256').update(secret.trim().toLowerCase()).digest('hex');

const isSameHash = (first: string, second: string): boolean => {
  const firstBytes = Buffer.from(first, 'hex');
  const secondBytes = Buffer.from(second, 'hex');
  return (
    firstBytes.length === secondBytes.length &&
    firstBytes.length > 0 &&
    timingSafeEqual(firstBytes, secondBytes)
  );
};

const createPlayer = (
  name: string,
  now: number,
  reconnectToken: string,
): RoomPlayerRecord => ({
  playerId: randomUUID(),
  name,
  connected: true,
  paused: false,
  pausedAt: null,
  lastActiveAt: now,
  missedRoundsCount: 0,
  spectatorPromptDeadlineAt: null,
  joinedAt: now,
  disconnectedAt: null,
  reconnectTokenHash: hashToken(reconnectToken),
  score: 0,
  streak: 0,
  maxStreak: 0,
  pinLocation: null,
  answeredMissionId: null,
  lastCommandId: 0,
  powerUps: { ...DEFAULT_PLAYER_POWER_UPS },
  doubleActiveForMissionId: null,
  hiddenChoiceIdsForMissionId: null,
  hiddenChoiceIds: [],
  hintForMissionId: null,
  hintText: null,
});

export interface RoomSettingsResult {
  snapshot: RoomSnapshot;
  queued: boolean;
}

@Injectable()
export class RoomLifecycleService {
  private readonly logger = new Logger(RoomLifecycleService.name);

  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly repository: RoomRepository,
    private readonly mutations: RoomMutationService,
    private readonly countries: CountryCatalogService,
    private readonly gameEngine: GameEngineService,
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  async createRoom(request: RoomCreateRequest) {
    const name = parsePlayerName(request.playerName);
    const roomConfig = this.validateConfiguration(
      request.config ?? DEFAULT_ROOM_CONFIGURATION,
    );
    const visibility = request.visibility ?? 'private';
    const roomSecret =
      visibility === 'private' ? (request.secret ?? createRoomSecret()) : null;
    const secretHash = roomSecret ? hashSecret(roomSecret) : null;

    for (let length = this.config.getOrThrow('roomIdLength'); length <= 12; length += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const reconnectToken = createReconnectToken();
        const now = Date.now();
        const host = createPlayer(name, now, reconnectToken);
        const roomId = createRoomId(length);
        const room: RoomRecord = {
          roomId,
          revision: 0,
          status: 'waiting',
          visibility,
          secret: roomSecret,
          secretHash,
          adminPlayerId: host.playerId,
          config: roomConfig,
          pendingConfig: null,
          players: [host],
          game: {
            startedAt: null,
            timerDeadlineAt: null,
            advanceAt: null,
            paused: false,
            pausedAt: null,
            pauseDeadlineAt: null,
            pausedRoundRemainingMs: null,
            pausedTimerRemainingMs: null,
            pausedAdvanceRemainingMs: null,
            round: null,
            usedCountryCodes: [],
          },
          lastActivityAt: now,
          expiresAt: this.getExpiryDate(now),
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };

        try {
          await this.repository.create(room);
          this.logger.log(`Room ${roomId} created`);
          return {
            playerId: host.playerId,
            reconnectToken,
            nextCommandId: 1,
            snapshot: toRoomSnapshot(room, host.playerId),
            ...(roomSecret ? { roomSecret } : {}),
          };
        } catch (error) {
          if (!this.isDuplicateKeyError(error)) throw error;
        }
      }
    }

    throw new Error('Could not allocate a unique room identifier.');
  }

  async inspectRoom(roomId: string): Promise<RoomInspectResult> {
    const room = await this.repository.findById(roomId);
    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    if (room.expiresAt.getTime() <= Date.now()) {
      throw new RoomDomainError('ROOM_EXPIRED');
    }
    const visibility = room.visibility ?? 'private';
    this.logger.log(`Room ${room.roomId} inspected (${visibility})`);
    return {
      roomId: room.roomId,
      visibility,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: this.config.getOrThrow('roomMaxPlayers'),
      requiresSecret: visibility === 'private' && Boolean(room.secretHash),
    };
  }

  async joinPublicRoom(request: RoomCreateRequest) {
    const playerName = parsePlayerName(request.playerName);
    const rooms = await this.repository.findAvailablePublicRooms(
      this.config.getOrThrow('roomMaxPlayers'),
    );
    rooms.sort((first, second) => {
      const connectedDifference =
        second.players.filter((player) => player.connected).length -
        first.players.filter((player) => player.connected).length;
      return connectedDifference || second.players.length - first.players.length;
    });

    for (const room of rooms) {
      try {
        return await this.joinRoom({
          requestId: request.requestId,
          roomId: room.roomId,
          playerName,
        });
      } catch (error) {
        if (
          error instanceof RoomDomainError &&
          ['ROOM_FULL', 'ROOM_NOT_JOINABLE', 'ROOM_NOT_FOUND', 'STALE_REVISION'].includes(error.code)
        ) {
          continue;
        }
        throw error;
      }
    }

    return this.createRoom({
      requestId: request.requestId,
      playerName,
      visibility: 'public',
      config: request.config,
    });
  }

  async joinRoom(request: RoomJoinRequest) {
    const playerName = parsePlayerName(request.playerName);
    const reconnectToken = createReconnectToken();
    const now = Date.now();
    const player = createPlayer(playerName, now, reconnectToken);
    const { room } = await this.mutations.update(request.roomId, (draft) => {
      if ((draft.visibility ?? 'private') === 'private' && draft.secretHash) {
        if (!request.secret) {
          throw new RoomDomainError('SECRET_REQUIRED');
        }
        if (!isSameHash(draft.secretHash, hashSecret(request.secret))) {
          throw new RoomDomainError('INVALID_SECRET');
        }
      }
      if (
        draft.players.length >= this.config.getOrThrow('roomMaxPlayers')
      ) {
        throw new RoomDomainError('ROOM_FULL');
      }
      draft.players.push(player);
      draft.lastActivityAt = now;
      syncRoomPauseState(draft, now);
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    this.logger.log(`Player ${player.playerId} joined room ${room.roomId}`);
    return {
      playerId: player.playerId,
      reconnectToken,
      nextCommandId: 1,
      snapshot: toRoomSnapshot(room, player.playerId),
      ...(room.visibility === 'private' && room.secret
        ? { roomSecret: room.secret }
        : {}),
    };
  }

  async reconnect(request: RoomReconnectRequest) {
    const reconnectToken = createReconnectToken();
    const now = Date.now();
    const { room, result } = await this.mutations.update(
      request.roomId,
      (draft) => {
        const player = draft.players.find(
          (item) => item.playerId === request.playerId,
        );
        if (
          !player ||
          !isSameHash(player.reconnectTokenHash, hashToken(request.reconnectToken))
        ) {
          throw new RoomDomainError('NOT_AUTHORIZED');
        }

        const gracePeriod = this.config.getOrThrow('reconnectGraceMs');
        if (
          !player.connected &&
          (player.disconnectedAt === null ||
            now - player.disconnectedAt > gracePeriod)
        ) {
          throw new RoomDomainError('NOT_AUTHORIZED');
        }

        player.connected = true;
        player.disconnectedAt = null;
        player.lastActiveAt = now;
        player.reconnectTokenHash = hashToken(reconnectToken);
        draft.lastActivityAt = now;

        const admin = draft.players.find(
          (item) => item.playerId === draft.adminPlayerId,
        );
        if (
          admin &&
          !admin.connected &&
          admin.disconnectedAt !== null &&
          now - admin.disconnectedAt > gracePeriod
        ) {
          draft.adminPlayerId = getNextAdminPlayerId(draft.players);
        }
        syncRoomPauseState(draft, now);
        return player.lastCommandId + 1;
      },
    );

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    this.logger.log(`Player ${request.playerId} reconnected to room ${room.roomId}`);
    return {
      playerId: request.playerId,
      reconnectToken,
      nextCommandId: result,
      snapshot: toRoomSnapshot(room, request.playerId),
      ...(room.visibility === 'private' && room.secret
        ? { roomSecret: room.secret }
        : {}),
    };
  }

  async startRoom(roomId: string, playerId: string) {
    const countryList = await this.countries.getCountries();
    const now = Date.now();
    const { room } = await this.mutations.update(roomId, (draft) => {
      this.requireAdmin(draft, playerId);
      const connectedCount = draft.players.filter(
        (player) => player.connected,
      ).length;
      if (
        (draft.status !== 'waiting' && draft.status !== 'finished') ||
        connectedCount < 2
      ) {
        throw new RoomDomainError('ROOM_NOT_STARTABLE');
      }

      if (draft.pendingConfig) {
        draft.config = draft.pendingConfig;
        draft.pendingConfig = null;
      }

      const created = this.gameEngine.createRound(
        draft.config,
        countryList,
        [],
        1,
        this.config.getOrThrow('choicesPerRound'),
      );
      if (!created) {
        const mapAnchorCount = countryList.filter(
          (country) => country.mapAnchor !== null,
        ).length;
        this.logger.error(
          `Could not create the first round: mode=${draft.config.mode}, pinDirection=${draft.config.pinDirection}, countries=${countryList.length}, mapAnchors=${mapAnchorCount}.`,
        );
        throw new RoomDomainError('ROUND_UNAVAILABLE');
      }

      stampRoundTiming(
        created.round,
        now,
        resolveRoundTimeLimitMs(
          draft.config,
          this.config.getOrThrow('roundTimeLimitMs'),
        ),
      );
      draft.status = 'playing';
      draft.pendingConfig = null;
      draft.lastActivityAt = now;
      draft.expiresAt = this.getExpiryDate(now);
      draft.players = draft.players.map((player) => ({
        ...player,
        paused: false,
        pausedAt: null,
        lastActiveAt: now,
        missedRoundsCount: 0,
        spectatorPromptDeadlineAt: null,
        score: 0,
        streak: 0,
        maxStreak: 0,
        pinLocation: null,
        answeredMissionId: null,
        lastCommandId: 0,
        powerUps: { ...DEFAULT_PLAYER_POWER_UPS },
        doubleActiveForMissionId: null,
        hiddenChoiceIdsForMissionId: null,
        hiddenChoiceIds: [],
        hintForMissionId: null,
        hintText: null,
      }));
      draft.game = {
        startedAt: now,
        timerDeadlineAt:
          draft.config.challengeType === 'timer'
            ? now + draft.config.challengeValue * 1000
            : null,
        advanceAt: null,
        paused: false,
        pausedAt: null,
        pauseDeadlineAt: null,
        pausedRoundRemainingMs: null,
        pausedTimerRemainingMs: null,
        pausedAdvanceRemainingMs: null,
        round: created.round,
        usedCountryCodes: created.usedCountryCodes,
      };
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return toRoomSnapshot(room);
  }

  async changeSettings(
    roomId: string,
    playerId: string,
    configuration: unknown,
  ): Promise<RoomSettingsResult> {
    const nextConfig = this.validateConfiguration(configuration);
    const now = Date.now();
    const { room, result } = await this.mutations.update(roomId, (draft) => {
      this.requireAdmin(draft, playerId);
      const admin = this.requireConnectedPlayer(draft, playerId);
      admin.lastActiveAt = now;
      draft.lastActivityAt = now;
      if (draft.status === 'waiting' || draft.status === 'finished') {
        draft.config = nextConfig;
        draft.pendingConfig = null;
        return false;
      }
      if (draft.status !== 'playing') {
        throw new RoomDomainError('ROOM_NOT_STARTABLE');
      }
      draft.pendingConfig = nextConfig;
      return true;
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return { snapshot: toRoomSnapshot(room), queued: result };
  }

  async setPaused(roomId: string, playerId: string, paused: boolean) {
    const now = Date.now();
    const { room } = await this.mutations.update(roomId, (draft) => {
      if (draft.status !== 'playing') {
        throw new RoomDomainError('INVALID_COMMAND');
      }
      const player = this.requireConnectedPlayer(draft, playerId);
      player.lastActiveAt = now;
      player.missedRoundsCount = 0;
      player.spectatorPromptDeadlineAt = null;
      draft.lastActivityAt = now;

      const wasPaused = Boolean(player.paused);
      player.paused = paused;
      player.pausedAt = paused ? now : null;

      if (wasPaused === paused) {
        return;
      }

      syncRoomPauseState(draft, now);

      if (paused && !draft.game.paused) {
        const round = draft.game.round;
        if (
          round &&
          !round.revealed &&
          player.answeredMissionId !== round.missionId
        ) {
          player.streak = 0;
        }
        if (draft.game.advanceAt === null && areConnectedPlayersDone(draft)) {
          revealRoomRound(
            draft,
            now,
            this.config.getOrThrow('roundAdvanceDelayMs'),
          );
        }
      }
    });
    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return toRoomSnapshot(room);
  }

  async leaveRoom(roomId: string, playerId: string) {
    const now = Date.now();
    const { room, result } = await this.mutations.update(
      roomId,
      (draft) => {
        const previousAdminId = draft.adminPlayerId;
        const index = draft.players.findIndex(
          (player) => player.playerId === playerId,
        );
        if (index < 0) throw new RoomDomainError('NOT_CONNECTED');
        draft.players.splice(index, 1);
        if (previousAdminId === playerId && draft.players.length > 0) {
          draft.adminPlayerId = getNextAdminPlayerId(draft.players);
        }
        syncRoomPauseState(draft, now);
        if (
          draft.status === 'playing' &&
          !draft.game.paused &&
          draft.game.advanceAt === null &&
          areConnectedPlayersDone(draft)
        ) {
          revealRoomRound(
            draft,
            now,
            this.config.getOrThrow('roundAdvanceDelayMs'),
          );
        }
        return previousAdminId === playerId;
      },
    );

    if (!room) {
      this.logger.log(`Last player left room ${roomId}`);
      return { snapshot: null, adminTransferred: result };
    }
    return {
      snapshot: toRoomSnapshot(room),
      adminTransferred: result,
    };
  }

  async markDisconnected(
    roomId: string,
    playerId: string,
    reconnectToken?: string,
  ) {
    const now = Date.now();
    const { room } = await this.mutations.update(roomId, (draft) => {
      const player = draft.players.find((item) => item.playerId === playerId);
      if (
        !player ||
        !player.connected ||
        (reconnectToken !== undefined &&
          !isSameHash(
            player.reconnectTokenHash,
            hashToken(reconnectToken),
          ))
      ) {
        return;
      }
      player.connected = false;
      player.disconnectedAt = now;
      syncRoomPauseState(draft, now);
      if (
        draft.status === 'playing' &&
        !draft.game.paused &&
        draft.game.advanceAt === null &&
        areConnectedPlayersDone(draft)
      ) {
        revealRoomRound(
          draft,
          now,
          this.config.getOrThrow('roundAdvanceDelayMs'),
        );
      }
    });
    return room ? toRoomSnapshot(room) : null;
  }

  async getSnapshot(
    roomId: string,
    recipientPlayerId?: string | null,
  ): Promise<RoomSnapshot> {
    return toRoomSnapshot(await this.mutations.get(roomId), recipientPlayerId);
  }

  private validateConfiguration(value: unknown): RoomConfiguration {
    const configuration = parseRoomConfiguration(value);
    if (
      configuration.challengeValue >
      this.config.getOrThrow('maxChallengeValue')
    ) {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    return configuration;
  }

  private requireAdmin(room: RoomRecord, playerId: string): void {
    this.requireConnectedPlayer(room, playerId);
    if (room.adminPlayerId !== playerId) {
      throw new RoomDomainError('NOT_ADMIN');
    }
  }

  private requireConnectedPlayer(
    room: RoomRecord,
    playerId: string,
  ): RoomPlayerRecord {
    const player = room.players.find(
      (item) => item.playerId === playerId && item.connected,
    );
    if (!player) throw new RoomDomainError('NOT_CONNECTED');
    return player;
  }

  private getExpiryDate(now: number): Date {
    return new Date(
      now + this.config.getOrThrow('roomExpiryHours') * 60 * 60 * 1000,
    );
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
