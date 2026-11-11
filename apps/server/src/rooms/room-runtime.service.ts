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
  applyNextLegRound,
  areConnectedPlayersDone,
  enterRoomCheckpoint,
  getNextAdminPlayerId,
  resolveRoundTimeLimitMs,
  revealRoomRound,
  stampRoundTiming,
  syncRoomPauseState,
} from './domain/room-rules.js';
import { toRoomSnapshot } from './domain/room-snapshot.js';
import { RoomMutationService } from './room-mutation.service.js';

export interface KickedPlayerNotice {
  roomId: string;
  playerId: string;
  reason: 'inactivity';
}

export interface ClosedRoomNotice {
  roomId: string;
  reason?: 'inactivity';
}

export interface RoomRuntimeUpdate {
  snapshots: RoomSnapshot[];
  removedRoomIds: string[];
  closedRooms?: ClosedRoomNotice[];
  kickedPlayers?: KickedPlayerNotice[];
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
    const closedRooms: ClosedRoomNotice[] = [];
    const kickedPlayers: KickedPlayerNotice[] = [];

    await this.removeExpiredRooms(now, removedRoomIds);
    await this.expireDisconnectedPlayers(now, snapshots, removedRoomIds);
    await this.resumeExpiredPauses(now, snapshots);
    await this.advanceDueCheckpoints(now, snapshots);
    await this.finishExpiredMatches(now, snapshots);
    await this.revealTimedOutRounds(now, snapshots);
    await this.advanceCompletedRounds(now, snapshots);
    await this.processInactivity(
      now,
      snapshots,
      removedRoomIds,
      closedRooms,
      kickedPlayers,
    );

    return { snapshots, removedRoomIds, closedRooms, kickedPlayers };
  }

  private async processInactivity(
    now: number,
    snapshots: RoomSnapshot[],
    removedRoomIds: string[],
    closedRooms: ClosedRoomNotice[],
    kickedPlayers: KickedPlayerNotice[],
  ): Promise<void> {
    const activeRooms = await this.repository.findRoomsWithConnectedPlayers();
    const waitingLimitMs = this.config.getOrThrow('roomWaitingInactivityMs');
    const playingLimitMs = this.config.getOrThrow('roomPlayingInactivityMs');
    const idleToSpectatorMs = this.config.getOrThrow('playerIdleToSpectatorMs');
    const promptDelayMs = this.config.getOrThrow('spectatorPromptDelayMs');
    const promptGraceMs = this.config.getOrThrow('spectatorPromptGraceMs');

    const upsertSnapshot = (snapshot: RoomSnapshot) => {
      const existingIndex = snapshots.findIndex(
        (item) => item.roomId === snapshot.roomId,
      );
      if (existingIndex >= 0) {
        snapshots[existingIndex] = snapshot;
      } else {
        snapshots.push(snapshot);
      }
    };

    const removeSnapshotsForRoom = (roomId: string) => {
      for (let index = snapshots.length - 1; index >= 0; index -= 1) {
        if (snapshots[index]?.roomId === roomId) {
          snapshots.splice(index, 1);
        }
      }
    };

    for (const candidate of activeRooms) {
      if (removedRoomIds.includes(candidate.roomId)) continue;

      const roomLastActive =
        candidate.lastActivityAt ?? candidate.updatedAt.getTime();
      const roomInactivityLimitMs =
        candidate.status === 'playing' ? playingLimitMs : waitingLimitMs;

      if (now - roomLastActive >= roomInactivityLimitMs) {
        await this.mutations.delete(candidate.roomId);
        removeSnapshotsForRoom(candidate.roomId);
        removedRoomIds.push(candidate.roomId);
        closedRooms.push({ roomId: candidate.roomId, reason: 'inactivity' });
        continue;
      }

      const needsPlayerUpdate = candidate.players.some((player) => {
        if (!player.connected) return false;
        if (player.paused) {
          if (
            player.spectatorPromptDeadlineAt != null &&
            now >= player.spectatorPromptDeadlineAt
          ) {
            return true;
          }
          const pausedSince =
            player.pausedAt ?? player.lastActiveAt ?? player.joinedAt;
          return (
            player.spectatorPromptDeadlineAt == null &&
            now - pausedSince >= promptDelayMs
          );
        }
        if (candidate.status === 'playing') {
          const lastActive =
            player.lastActiveAt ?? candidate.game.startedAt ?? player.joinedAt;
          return (
            now - lastActive >= idleToSpectatorMs ||
            (player.missedRoundsCount ?? 0) >= 2
          );
        }
        return false;
      });
      if (!needsPlayerUpdate) continue;

      const kickedInRoom: string[] = [];
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        let changed = false;
        const previousAdminId = draft.adminPlayerId;

        const remainingPlayers = draft.players.filter((player) => {
          if (
            player.connected &&
            player.paused &&
            player.spectatorPromptDeadlineAt != null &&
            now >= player.spectatorPromptDeadlineAt
          ) {
            kickedInRoom.push(player.playerId);
            return false;
          }
          return true;
        });

        if (remainingPlayers.length !== draft.players.length) {
          draft.players = remainingPlayers;
          changed = true;
          if (
            draft.players.length > 0 &&
            !draft.players.some((player) => player.playerId === previousAdminId)
          ) {
            draft.adminPlayerId = getNextAdminPlayerId(draft.players);
          }
        }

        for (const player of draft.players) {
          if (!player.connected || !player.paused) continue;
          const pausedSince =
            player.pausedAt ?? player.lastActiveAt ?? player.joinedAt;
          if (
            player.spectatorPromptDeadlineAt == null &&
            now - pausedSince >= promptDelayMs
          ) {
            player.spectatorPromptDeadlineAt = now + promptGraceMs;
            changed = true;
          }
        }

        if (draft.status === 'playing') {
          for (const player of draft.players) {
            if (!player.connected || player.paused) continue;
            const lastActive =
              player.lastActiveAt ?? draft.game.startedAt ?? player.joinedAt;
            const idleTooLong = now - lastActive >= idleToSpectatorMs;
            const missedTooManyRounds = (player.missedRoundsCount ?? 0) >= 2;
            if (idleTooLong || missedTooManyRounds) {
              player.paused = true;
              player.pausedAt = now;
              player.spectatorPromptDeadlineAt = null;
              if (
                draft.game.round &&
                !draft.game.round.revealed &&
                player.answeredMissionId !== draft.game.round.missionId
              ) {
                player.streak = 0;
              }
              changed = true;
            }
          }
        }

        if (changed) {
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
        }

        return changed;
      });

      for (const playerId of kickedInRoom) {
        kickedPlayers.push({
          roomId: candidate.roomId,
          playerId,
          reason: 'inactivity',
        });
      }

      if (!mutation) continue;
      if (!mutation.room) {
        removeSnapshotsForRoom(candidate.roomId);
        if (!removedRoomIds.includes(candidate.roomId)) {
          removedRoomIds.push(candidate.roomId);
          closedRooms.push({ roomId: candidate.roomId, reason: 'inactivity' });
        }
        continue;
      }

      if (mutation.result) {
        upsertSnapshot(toRoomSnapshot(mutation.room));
      }
    }
  }

  private async resumeExpiredPauses(
    now: number,
    snapshots: RoomSnapshot[],
  ): Promise<void> {
    const due = await this.repository.findDuePauseDeadlines(now);
    for (const candidate of due) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        if (
          draft.status !== 'playing' ||
          !draft.game.paused ||
          draft.game.pauseDeadlineAt == null ||
          draft.game.pauseDeadlineAt > now
        ) {
          return false;
        }
        for (const player of draft.players) {
          if (player.paused) {
            player.paused = false;
            player.pausedAt = null;
            player.lastActiveAt = now;
            player.missedRoundsCount = 0;
            player.spectatorPromptDeadlineAt = null;
          }
        }
        syncRoomPauseState(draft, now);
        if (
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
        return true;
      });
      if (!mutation?.room) continue;
      snapshots.push(toRoomSnapshot(mutation.room));
    }
  }

  private async revealTimedOutRounds(
    now: number,
    snapshots: RoomSnapshot[],
  ): Promise<void> {
    const due = await this.repository.findDueRoundDeadlines(now);
    for (const candidate of due) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        const round = draft.game.round;
        if (
          draft.status !== 'playing' ||
          draft.game.paused ||
          draft.game.advanceAt !== null ||
          !round ||
          round.revealed ||
          round.deadlineAt == null ||
          round.deadlineAt > now
        ) {
          return false;
        }
        for (const player of draft.players) {
          if (!player.paused && player.answeredMissionId !== round.missionId) {
            player.streak = 0;
          }
        }
        revealRoomRound(
          draft,
          now,
          this.config.getOrThrow('roundAdvanceDelayMs'),
          { timedOut: true },
        );
        return true;
      });
      if (!mutation?.room) continue;
      snapshots.push(toRoomSnapshot(mutation.room));
    }
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

        syncRoomPauseState(draft, now);

        if (
          draft.status === 'playing' &&
          !draft.game.paused &&
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

  private async advanceDueCheckpoints(
    now: number,
    snapshots: RoomSnapshot[],
  ): Promise<void> {
    const due = await this.repository.findDueCheckpoints(now);
    if (due.length === 0) return;
    const countries = await this.countries.getCountries();

    for (const candidate of due) {
      const mutation = await this.mutateSafely(candidate.roomId, (draft) => {
        if (
          draft.status !== 'checkpoint' ||
          draft.game.checkpointPaused ||
          draft.game.checkpointResumeAt == null ||
          draft.game.checkpointResumeAt > now
        ) {
          return false;
        }
        if (draft.pendingConfig) {
          draft.config = draft.pendingConfig;
          draft.pendingConfig = null;
        }
        const nextLegNumber = (draft.game.legNumber ?? 1) + 1;
        const nextRoundNumber = (draft.game.round?.number ?? 0) + 1;
        const created = this.gameEngine.createRound(
          draft.config,
          countries,
          draft.game.usedCountryCodes,
          nextRoundNumber,
          this.config.getOrThrow('choicesPerRound'),
          nextLegNumber,
        );
        if (!created) {
          this.finishMatch(draft, now);
          return true;
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
        return true;
      });
      if (!mutation?.room) continue;
      snapshots.push(toRoomSnapshot(mutation.room));
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
        if (draft.config.endless === false) {
          this.finishMatch(draft, now);
        } else {
          enterRoomCheckpoint(
            draft,
            now,
            this.config.getOrThrow('checkpointDurationMs'),
          );
        }
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

    const currentLegRound = room.game.legRoundNumber ?? currentRound.number;
    if (
      room.config.challengeType === 'count' &&
      currentLegRound >= room.config.challengeValue
    ) {
      if (room.config.endless === false) {
        this.finishMatch(room, now);
      } else {
        enterRoomCheckpoint(
          room,
          now,
          this.config.getOrThrow('checkpointDurationMs'),
        );
      }
      return;
    }

    const legNumber = room.game.legNumber ?? 1;
    const nextRound = this.gameEngine.createRound(
      room.config,
      countries,
      room.game.usedCountryCodes,
      currentRound.number + 1,
      this.config.getOrThrow('choicesPerRound'),
      legNumber,
    );
    if (!nextRound) {
      if (room.config.endless === false) {
        this.finishMatch(room, now);
        return;
      }
      room.game.usedCountryCodes = [];
      room.game.lapNumber = (room.game.lapNumber ?? 1) + 1;
      enterRoomCheckpoint(
        room,
        now,
        this.config.getOrThrow('checkpointDurationMs'),
      );
      return;
    }

    if (nextRound.lapWrapped) {
      room.game.lapNumber = (room.game.lapNumber ?? 1) + 1;
    }
    room.game.legRoundNumber = currentLegRound + 1;

    stampRoundTiming(
      nextRound.round,
      now,
      resolveRoundTimeLimitMs(
        room.config,
        this.config.getOrThrow('roundTimeLimitMs'),
      ),
    );
    room.game.round = nextRound.round;
    room.game.usedCountryCodes = nextRound.usedCountryCodes;
    room.game.advanceAt = null;
    for (const player of room.players) {
      player.pinLocation = null;
      player.doubleActiveForMissionId = null;
      player.hiddenChoiceIdsForMissionId = null;
      player.hiddenChoiceIds = [];
      player.hintForMissionId = null;
      player.hintText = null;
    }
  }

  private finishMatch(room: RoomRecord, now: number): void {
    if (room.game.round && !room.game.round.revealed) {
      revealRoomRound(room, now, 0);
    }
    room.status = 'finished';
    room.game.timerDeadlineAt = null;
    room.game.advanceAt = null;
    room.game.checkpointResumeAt = null;
    room.game.checkpointPaused = false;
    room.game.pausedCheckpointRemainingMs = null;
    room.game.checkpointSummary = null;
    for (const player of room.players) {
      player.paused = false;
      player.pausedAt = null;
    }
    syncRoomPauseState(room, now);
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
