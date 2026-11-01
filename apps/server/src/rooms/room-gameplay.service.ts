import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerConfiguration } from '../config/server-configuration.js';
import type { RoomCommand, RoomRecord, RoomSnapshot } from './domain/room.types.js';
import { RoomDomainError } from './domain/room-errors.js';
import {
  ROOM_REPOSITORY,
  type RoomRepository,
} from './domain/room-repository.js';
import { revealRoomRound } from './domain/room-rules.js';
import { toRoomSnapshot } from './domain/room-snapshot.js';
import { RoomMutationService } from './room-mutation.service.js';

export type RoomCommandRejectionReason =
  | 'invalid-command'
  | 'stale-revision'
  | 'stale-mission'
  | 'duplicate'
  | 'not-allowed';

export type RoomCommandOutcome =
  | {
      commandId: number;
      accepted: true;
      answerResult: boolean | null;
      snapshot: RoomSnapshot;
    }
  | {
      commandId: number;
      accepted: false;
      reason: RoomCommandRejectionReason;
      snapshot: RoomSnapshot;
    };

@Injectable()
export class RoomGameplayService {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly repository: RoomRepository,
    private readonly mutations: RoomMutationService,
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  async submitCommand(
    roomId: string,
    playerId: string,
    command: RoomCommand,
  ): Promise<RoomCommandOutcome> {
    try {
      const { room, result } = await this.mutations.update(roomId, (draft) => {
        return this.applyCommand(draft, playerId, command);
      });
      if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
      return {
        commandId: command.commandId,
        accepted: true,
        answerResult: result,
        snapshot: toRoomSnapshot(room),
      };
    } catch (error) {
      if (!(error instanceof RoomDomainError)) throw error;
      const room = await this.repository.findById(roomId);
      if (!room) throw error;
      return {
        commandId: command.commandId,
        accepted: false,
        reason: this.toRejectionReason(error),
        snapshot: toRoomSnapshot(room),
      };
    }
  }

  private applyCommand(
    room: RoomRecord,
    playerId: string,
    command: RoomCommand,
  ): boolean | null {
    const player = room.players.find(
      (item) => item.playerId === playerId && item.connected,
    );
    if (!player) throw new RoomDomainError('NOT_CONNECTED');
    if (command.expectedRevision !== room.revision) {
      throw new RoomDomainError('STALE_REVISION');
    }
    if (command.commandId <= player.lastCommandId) {
      throw new RoomDomainError('DUPLICATE_COMMAND');
    }

    const round = room.game.round;
    if (room.status !== 'playing' || !round || room.game.advanceAt !== null) {
      throw new RoomDomainError('INVALID_COMMAND');
    }
    if (command.missionId !== round.missionId) {
      throw new RoomDomainError('STALE_MISSION');
    }

    if (command.type === 'reveal' || command.type === 'skip') {
      if (playerId !== room.adminPlayerId) {
        throw new RoomDomainError('NOT_ADMIN');
      }
      this.completeRound(room, Date.now());
      player.lastCommandId = command.commandId;
      return null;
    }

    if (round.revealed || player.answeredMissionId === round.missionId) {
      throw new RoomDomainError('DUPLICATE_COMMAND');
    }

    const selectedCountryCode = this.resolveAnswer(room, command);
    player.lastCommandId = command.commandId;
    player.answeredMissionId = round.missionId;
    player.pinLocation = command.pinLocation
      ? [command.pinLocation[0], command.pinLocation[1]]
      : null;
    const isCorrect = selectedCountryCode === round.targetCountryCode;
    if (isCorrect) {
      player.score +=
        this.config.getOrThrow('pointsPerCorrectAnswer') +
        player.streak * this.config.getOrThrow('streakBonusPoints');
      player.streak += 1;
      player.maxStreak = Math.max(player.maxStreak, player.streak);
      this.completeRound(room, Date.now());
      return true;
    }

    player.streak = 0;
    const connectedPlayers = room.players.filter((member) => member.connected);
    if (
      connectedPlayers.length > 0 &&
      connectedPlayers.every(
        (member) => member.answeredMissionId === round.missionId,
      )
    ) {
      this.completeRound(room, Date.now());
    }
    return false;
  }

  private resolveAnswer(
    room: RoomRecord,
    command: Extract<RoomCommand, { type: 'answer' }>,
  ): string | null {
    const usesChoices =
      room.config.mode === 'reverse' ||
      (room.config.mode === 'pin' && room.config.pinDirection === 'identify');
    if (usesChoices) {
      if (
        !command.choiceId ||
        command.answerCountryCode !== null ||
        command.pinLocation !== undefined
      ) {
        throw new RoomDomainError('INVALID_COMMAND');
      }
      const choice = room.game.round?.choices.find(
        (item) => item.id === command.choiceId,
      );
      if (!choice) throw new RoomDomainError('INVALID_COMMAND');
      return choice.countryCode;
    }

    if (command.choiceId !== undefined) {
      throw new RoomDomainError('INVALID_COMMAND');
    }
    if (
      room.config.mode === 'pin' &&
      room.config.pinDirection === 'locate'
    ) {
      if (!command.pinLocation) throw new RoomDomainError('INVALID_COMMAND');
    } else if (command.pinLocation !== undefined) {
      throw new RoomDomainError('INVALID_COMMAND');
    }
    return command.answerCountryCode;
  }

  private completeRound(
    room: RoomRecord,
    now: number,
  ): void {
    revealRoomRound(
      room,
      now,
      this.config.getOrThrow('roundAdvanceDelayMs'),
    );
  }

  private toRejectionReason(
    error: RoomDomainError,
  ): RoomCommandRejectionReason {
    switch (error.code) {
      case 'STALE_REVISION':
        return 'stale-revision';
      case 'STALE_MISSION':
        return 'stale-mission';
      case 'DUPLICATE_COMMAND':
        return 'duplicate';
      case 'NOT_ADMIN':
      case 'NOT_CONNECTED':
      case 'NOT_AUTHORIZED':
        return 'not-allowed';
      default:
        return 'invalid-command';
    }
  }
}
