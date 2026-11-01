import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerConfiguration } from '../config/server-configuration.js';
import { CountryCatalogService } from '../game/country-catalog.service.js';
import { GameEngineService } from '../game/game-engine.service.js';
import { RoomDomainError } from './domain/room-errors.js';
import {
  ROOM_REPOSITORY,
  type RoomRepository,
} from './domain/room-repository.js';
import type { RoomRecord, RoomSnapshot } from './domain/room.types.js';
import type { RoomMutationResult } from './room-mutation.service.js';
import {
  areConnectedPlayersDone,
  getNextAdminPlayerId,
  revealRoomRound,
} from './domain/room-rules.js';
import { toRoomSnapshot } from './domain/room-snapshot.js';
import { RoomMutationService } from './room-mutation.service.js';

export interface RoomRuntimeUpdate {
  snapshots: RoomSnapshot[];
  removedRoomIds: string[];
}

@Injectable()
export class RoomRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(RoomRuntimeService.name);

  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly repository: RoomRepository,
    private readonly mutations: RoomMutationService,
    private readonly countries: CountryCatalogService,
    private readonly gameEngine: GameEngineService,
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const activeRooms = await this.repository.findRoomsWithConnectedPlayers();
    const now = Date.now();
    for (const candidate of activeRooms) {
      await this.mutateSafely(candidate.roomId, (room) => {
        for (const player of room.players) {
          if (!player.connected) continue;
          player.connected = false;
          player.disconnectedAt = now;
        }
      });
    }
    this.logger.log(`Marked previous connections offline in ${activeRooms.length} room(s)`);
  }

  async tick(now = Date.now()): Promise<RoomRuntimeUpdate> {
    const snapshots: RoomSnapshot[] = [];
    const removedRoomIds: string[] = [];

    await this.removeExpiredRooms(now, removedRoomIds);
    await this.expireDisconnectedPlayers(now, snapshots, removedRoomIds);
    await this.finishExpiredMatches(now, snapshots);
    await this.advanceCompletedRounds(now, snapshots);

    return { snapshots, removedRoomIds };
  }

  private async removeExpiredRooms(
    now: number,
    removedRoomIds: string[],
  ): Promise<void> {
    const expired = await this.repository.findExpired(new Date(now));
    for (const room of expired) {
      await this.mutations.delete(room.roomId);
      removedRoomIds.push(room.roomId);
    }
  }

  private async expireDisconnectedPlayers(
    now: number,
    snapshots: RoomSnapshot[],
    removedRoomIds: string[],
  ): Promise<void> {
    const gracePeriod = this.config.getOrThrow('reconnectGraceMs');
    const rooms = await this.repository.findExpiredDisconnects(
      now - gracePeriod,
    );

    for (const candidate of rooms) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        const previousAdminId = draft.adminPlayerId;
        draft.players = draft.players.filter(
          (player) =>
            player.connected ||
            player.disconnectedAt === null ||
            now - player.disconnectedAt < gracePeriod,
        );
        if (
          draft.players.length > 0 &&
          !draft.players.some((player) => player.playerId === previousAdminId)
        ) {
          draft.adminPlayerId = getNextAdminPlayerId(draft.players);
        }

        if (
          draft.status === 'playing' &&
          draft.game.advanceAt === null &&
          areConnectedPlayersDone(draft)
        ) {
          return true;
        }
        return false;
      });
      if (!mutation) continue;
      const { room, result } = mutation;

      if (!room) {
        removedRoomIds.push(candidate.roomId);
        continue;
      }

      if (result) {
        await this.completeRoomRound(room.roomId, now);
        const refreshed = await this.mutations.get(room.roomId);
        snapshots.push(toRoomSnapshot(refreshed));
      } else {
        snapshots.push(toRoomSnapshot(room));
      }
    }
  }

  private async finishExpiredMatches(
    now: number,
    snapshots: RoomSnapshot[],
  ): Promise<void> {
    const expired = await this.repository.findDueTimers(now);
    if (expired.length === 0) return;

    for (const candidate of expired) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        if (
          draft.status !== 'playing' ||
          draft.game.timerDeadlineAt === null ||
          draft.game.timerDeadlineAt > now
        ) {
          return false;
        }
        this.finishMatch(draft, now);
        return true;
      });
      if (!mutation) continue;
      const { room } = mutation;
      if (room) snapshots.push(toRoomSnapshot(room));
    }
  }

  private async advanceCompletedRounds(
    now: number,
    snapshots: RoomSnapshot[],
  ): Promise<void> {
    const due = await this.repository.findDueAdvances(now);
    if (due.length === 0) return;
    const countries = await this.countries.getCountries();

    for (const candidate of due) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        if (
          draft.status !== 'playing' ||
          draft.game.advanceAt === null ||
          draft.game.advanceAt > now
        ) {
          return false;
        }
        this.advanceRound(draft, countries, now);
        return true;
      });
      if (!mutation) continue;
      const { room } = mutation;
      if (room) snapshots.push(toRoomSnapshot(room));
    }
  }

  private advanceRound(
    room: RoomRecord,
    countries: Awaited<ReturnType<CountryCatalogService['getCountries']>>,
    now: number,
  ): void {
    const currentRound = room.game.round;
    if (!currentRound) {
      throw new RoomDomainError('INVALID_COMMAND');
    }

    const previousConfig = room.config;
    if (room.pendingConfig) {
      room.config = room.pendingConfig;
      room.pendingConfig = null;
      if (
        previousConfig.challengeType !== room.config.challengeType ||
        room.config.challengeType === 'timer'
      ) {
        room.game.timerDeadlineAt =
          room.config.challengeType === 'timer'
            ? now + room.config.challengeValue * 1000
            : null;
      }
      if (
        previousConfig.challengeType !== room.config.challengeType ||
        previousConfig.challengeValue !== room.config.challengeValue
      ) {
        room.game.usedCountryCodes = [];
      }
    }

    if (
      room.config.challengeType === 'count' &&
      currentRound.number >= room.config.challengeValue
    ) {
      this.finishMatch(room, now);
      return;
    }

    const nextRound = this.gameEngine.createRound(
      room.config,
      countries,
      room.game.usedCountryCodes,
      currentRound.number + 1,
      this.config.getOrThrow('choicesPerRound'),
    );
    if (!nextRound) {
      this.finishMatch(room, now);
      return;
    }

    room.game.round = nextRound.round;
    room.game.usedCountryCodes = nextRound.usedCountryCodes;
    room.game.advanceAt = null;
    for (const player of room.players) {
      player.pinLocation = null;
    }
  }

  private finishMatch(room: RoomRecord, now: number): void {
    if (room.game.round && !room.game.round.revealed) {
      revealRoomRound(room, now, 0);
    }
    room.status = 'finished';
    room.game.timerDeadlineAt = null;
    room.game.advanceAt = null;
  }

  private async completeRoomRound(roomId: string, now: number): Promise<void> {
    await this.mutateSafely(roomId, (room) => {
      if (room.game.advanceAt !== null || !areConnectedPlayersDone(room)) {
        return false;
      }
      revealRoomRound(
        room,
        now,
        this.config.getOrThrow('roundAdvanceDelayMs'),
      );
      return true;
    });
  }

  private async mutateSafely<Result>(
    roomId: string,
    operation: (room: RoomRecord) => Result,
  ): Promise<RoomMutationResult<Result> | null> {
    try {
      return await this.mutations.update(roomId, operation);
    } catch (error) {
      if (
        error instanceof RoomDomainError &&
        ['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'STALE_REVISION'].includes(error.code)
      ) {
        return null;
      }
      throw error;
    }
  }
}
