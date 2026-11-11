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
  type RoomSettingsVoteResolvedEvent,
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
  applyNextLegRound,
  areConnectedPlayersDone,
  getNextAdminPlayerId,
  resolveRoundTimeLimitMs,
  revealRoomRound,
  stampRoundTiming,
  syncRoomPauseState,
} from './domain/room-rules.js';
import {
  applyValidatedRoomSettings,
  areRoomConfigurationsEqual,
  getVoteEligiblePlayerIds,
  reconcileSettingsVote,
  toSettingsVoteResolvedEvent,
} from './domain/room-settings-vote.js';
import {
  getLegDifficultyTier,
  getLegScoreMultiplier,
} from '../game/country-difficulty.js';
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
  legScore: 0,
  checkpointsWon: 0,
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
  settingsVoteCooldownUntil: null,
});

export interface RoomSettingsResult {
  snapshot: RoomSnapshot;
  queued: boolean;
  voteResolved?: RoomSettingsVoteResolvedEvent;
}

export interface RoomSettingsVoteProposalResult {
  snapshot: RoomSnapshot;
  voteId: string;
  voteResolved?: RoomSettingsVoteResolvedEvent;
}

export interface RoomSettingsVoteCastResult {
  snapshot: RoomSnapshot;
  voteResolved?: RoomSettingsVoteResolvedEvent;
  staleError?: boolean;
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
          settingsVote: null,
          players: [host],
          game: {
            startedAt: null,
            timerDeadlineAt: null,
            advanceAt: null,
            legNumber: 1,
            legRoundNumber: 1,
            lapNumber: 1,
            legMultiplier: 1,
            legTier: getLegDifficultyTier(roomConfig, 1),
            checkpointResumeAt: null,
            checkpointPaused: false,
            pausedCheckpointRemainingMs: null,
            checkpointSummary: null,
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

      if (draft.status === 'checkpoint') {
        draft.settingsVote = null;
        if (draft.pendingConfig) {
          draft.config = draft.pendingConfig;
          draft.pendingConfig = null;
        }
        const nextLegNumber = (draft.game.legNumber ?? 1) + 1;
        const nextRoundNumber = (draft.game.round?.number ?? 0) + 1;
        const created = this.gameEngine.createRound(
          draft.config,
          countryList,
          draft.game.usedCountryCodes,
          nextRoundNumber,
          this.config.getOrThrow('choicesPerRound'),
          nextLegNumber,
        );
        if (!created) {
          throw new RoomDomainError('ROUND_UNAVAILABLE');
        }
        applyNextLegRound(
          draft,
          created,
          now,
          resolveRoundTimeLimitMs(
            draft.config,
            this.config.getOrThrow('roundTimeLimitMs'),
          ),
        );
        draft.expiresAt = this.getExpiryDate(now);
        return;
      }

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
        1,
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
      draft.settingsVote = null;
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
        legScore: 0,
        checkpointsWon: 0,
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
        legNumber: 1,
        legRoundNumber: 1,
        lapNumber: 1,
        legMultiplier: getLegScoreMultiplier(1),
        legTier: getLegDifficultyTier(draft.config, 1),
        checkpointResumeAt: null,
        checkpointPaused: false,
        pausedCheckpointRemainingMs: null,
        checkpointSummary: null,
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

      let voteResolved: RoomSettingsVoteResolvedEvent | undefined;
      if (draft.settingsVote) {
        const supersededVote = draft.settingsVote;
        draft.settingsVote = null;
        voteResolved = toSettingsVoteResolvedEvent(draft.roomId, {
          outcome: 'superseded',
          vote: supersededVote,
          queued: false,
        });
      }

      const queued = applyValidatedRoomSettings(draft, nextConfig);
      return { queued, voteResolved };
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return {
      snapshot: toRoomSnapshot(room),
      queued: result.queued,
      ...(result.voteResolved ? { voteResolved: result.voteResolved } : {}),
    };
  }

  async proposeSettingsVote(
    roomId: string,
    playerId: string,
    configuration: unknown,
  ): Promise<RoomSettingsVoteProposalResult> {
    const nextConfig = this.validateConfiguration(configuration);
    const now = Date.now();
    const voteDurationMs = this.config.getOrThrow('settingsVoteDurationMs');

    const { room, result } = await this.mutations.update(roomId, (draft) => {
      const player = this.requireConnectedPlayer(draft, playerId);
      player.lastActiveAt = now;
      draft.lastActivityAt = now;

      const resolvedExisting = this.reconcileVoteEvent(draft, now);
      if (draft.settingsVote) {
        throw new RoomDomainError('VOTE_ALREADY_ACTIVE');
      }
      if (player.paused) {
        throw new RoomDomainError(
          'INVALID_COMMAND',
          'Resume playing before proposing a settings vote.',
        );
      }
      if (
        typeof player.settingsVoteCooldownUntil === 'number' &&
        now < player.settingsVoteCooldownUntil
      ) {
        throw new RoomDomainError('VOTE_COOLDOWN');
      }

      const eligibleIds = getVoteEligiblePlayerIds(draft);
      if (eligibleIds.length < 2) {
        throw new RoomDomainError('NOT_ENOUGH_PLAYERS');
      }

      const effectiveConfig = draft.pendingConfig ?? draft.config;
      if (areRoomConfigurationsEqual(effectiveConfig, nextConfig)) {
        throw new RoomDomainError('SETTINGS_UNCHANGED');
      }

      const voteId = randomUUID();
      draft.settingsVote = {
        voteId,
        proposerPlayerId: playerId,
        proposerName: player.name,
        proposedConfig: nextConfig,
        yesPlayerIds: [playerId],
        noPlayerIds: [],
        createdAt: now,
        expiresAt: now + voteDurationMs,
      };
      return { voteId, resolvedExisting };
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return {
      snapshot: toRoomSnapshot(room),
      voteId: result.voteId,
      ...(result.resolvedExisting
        ? { voteResolved: result.resolvedExisting }
        : {}),
    };
  }

  async castSettingsVote(
    roomId: string,
    playerId: string,
    voteId: string,
    approve: boolean,
  ): Promise<RoomSettingsVoteCastResult> {
    const now = Date.now();
    const { room, result } = await this.mutations.update(roomId, (draft) => {
      const player = this.requireConnectedPlayer(draft, playerId);
      player.lastActiveAt = now;
      draft.lastActivityAt = now;

      const resolvedBeforeCast = this.reconcileVoteEvent(draft, now);
      const vote = draft.settingsVote;
      if (!vote || vote.voteId !== voteId) {
        if (resolvedBeforeCast) {
          return { voteResolved: resolvedBeforeCast, staleError: true };
        }
        throw new RoomDomainError('VOTE_NOT_FOUND');
      }
      if (player.paused) {
        throw new RoomDomainError(
          'INVALID_COMMAND',
          'Resume playing to vote on settings.',
        );
      }
      if (
        vote.yesPlayerIds.includes(playerId) ||
        vote.noPlayerIds.includes(playerId)
      ) {
        throw new RoomDomainError('ALREADY_VOTED');
      }

      if (approve) {
        vote.yesPlayerIds.push(playerId);
      } else {
        vote.noPlayerIds.push(playerId);
      }

      const voteResolved = this.reconcileVoteEvent(draft, now);
      if (
        voteResolved &&
        draft.status === 'checkpoint' &&
        !draft.game.checkpointPaused &&
        draft.game.checkpointResumeAt != null &&
        draft.game.checkpointResumeAt < now + 3_000
      ) {
        draft.game.checkpointResumeAt = now + 3_000;
      }
      return { voteResolved, staleError: false };
    });

    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return {
      snapshot: toRoomSnapshot(room),
      ...(result.voteResolved ? { voteResolved: result.voteResolved } : {}),
      ...(result.staleError ? { staleError: true } : {}),
    };
  }

  async setPaused(
    roomId: string,
    playerId: string,
    paused: boolean,
  ): Promise<RoomSnapshot> {
    const detailed = await this.setPausedDetailed(roomId, playerId, paused);
    return detailed.snapshot;
  }

  async setPausedDetailed(
    roomId: string,
    playerId: string,
    paused: boolean,
  ): Promise<{
    snapshot: RoomSnapshot;
    voteResolved?: RoomSettingsVoteResolvedEvent;
  }> {
    const now = Date.now();
    const { room, result } = await this.mutations.update(roomId, (draft) => {
      if (draft.status === 'checkpoint') {
        this.requireAdmin(draft, playerId);
        const admin = this.requireConnectedPlayer(draft, playerId);
        admin.lastActiveAt = now;
        draft.lastActivityAt = now;
        if (paused && !draft.game.checkpointPaused) {
          draft.game.pausedCheckpointRemainingMs = Math.max(
            1_000,
            (draft.game.checkpointResumeAt ?? now) - now,
          );
          draft.game.checkpointPaused = true;
          draft.game.checkpointResumeAt = null;
        } else if (!paused && draft.game.checkpointPaused) {
          const defaultDuration: number =
            this.config.getOrThrow('checkpointDurationMs');
          const remaining =
            typeof draft.game.pausedCheckpointRemainingMs === 'number'
              ? draft.game.pausedCheckpointRemainingMs
              : defaultDuration;
          draft.game.checkpointPaused = false;
          draft.game.pausedCheckpointRemainingMs = null;
          draft.game.checkpointResumeAt = now + remaining;
        }
        return this.reconcileVoteEvent(draft, now);
      }

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
        return this.reconcileVoteEvent(draft, now);
      }

      syncRoomPauseState(draft, now);
      const voteResolved = this.reconcileVoteEvent(draft, now);

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
      return voteResolved;
    });
    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    return {
      snapshot: toRoomSnapshot(room),
      ...(result ? { voteResolved: result } : {}),
    };
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
        const voteResolved = this.reconcileVoteEvent(draft, now);
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
        return {
          adminTransferred: previousAdminId === playerId,
          voteResolved,
        };
      },
    );

    if (!room) {
      this.logger.log(`Last player left room ${roomId}`);
      return { snapshot: null, adminTransferred: result.adminTransferred };
    }
    return {
      snapshot: toRoomSnapshot(room),
      adminTransferred: result.adminTransferred,
      ...(result.voteResolved ? { voteResolved: result.voteResolved } : {}),
    };
  }

  async markDisconnected(
    roomId: string,
    playerId: string,
    reconnectToken?: string,
  ): Promise<RoomSnapshot | null> {
    const detailed = await this.markDisconnectedDetailed(
      roomId,
      playerId,
      reconnectToken,
    );
    return detailed.snapshot;
  }

  async markDisconnectedDetailed(
    roomId: string,
    playerId: string,
    reconnectToken?: string,
  ): Promise<{
    snapshot: RoomSnapshot | null;
    voteResolved?: RoomSettingsVoteResolvedEvent;
  }> {
    const now = Date.now();
    const { room, result } = await this.mutations.update(roomId, (draft) => {
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
        return undefined;
      }
      player.connected = false;
      player.disconnectedAt = now;
      syncRoomPauseState(draft, now);
      const voteResolved = this.reconcileVoteEvent(draft, now);
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
      return voteResolved;
    });
    return {
      snapshot: room ? toRoomSnapshot(room) : null,
      ...(result ? { voteResolved: result } : {}),
    };
  }

  private reconcileVoteEvent(
    room: RoomRecord,
    now: number,
  ): RoomSettingsVoteResolvedEvent | undefined {
    const resolved = reconcileSettingsVote(
      room,
      now,
      this.config.getOrThrow('settingsVoteCooldownMs'),
    );
    return resolved
      ? toSettingsVoteResolvedEvent(room.roomId, resolved)
      : undefined;
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
