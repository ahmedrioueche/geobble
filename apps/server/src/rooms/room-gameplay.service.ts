import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import type { ServerConfiguration } from '../config/server-configuration.js';
import {
  DEFAULT_PLAYER_POWER_UPS,
  type PowerUpKind,
  type RoomCommand,
  type RoomPlayerRecord,
  type RoomRecord,
  type RoomRoundRecord,
  type RoomSnapshot,
} from './domain/room.types.js';
import { RoomDomainError } from './domain/room-errors.js';
import {
  ROOM_REPOSITORY,
  type RoomRepository,
} from './domain/room-repository.js';
import {
  resolveRoundTimeLimitMs,
  revealRoomRound,
} from './domain/room-rules.js';
import {
  calculateClosestPinBonus,
  calculateGreatCircleDistanceKm,
  calculateRoundPoints,
} from './domain/room-scoring.js';
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
      roomRecord: RoomRecord;
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
        snapshot: toRoomSnapshot(room, playerId),
        roomRecord: room,
      };
    } catch (error) {
      if (!(error instanceof RoomDomainError)) throw error;
      const room = await this.repository.findById(roomId);
      if (!room) throw error;
      return {
        commandId: command.commandId,
        accepted: false,
        reason: this.toRejectionReason(error),
        snapshot: toRoomSnapshot(room, playerId),
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
    if (round.deadlineAt != null && Date.now() > round.deadlineAt) {
      throw new RoomDomainError('INVALID_COMMAND');
    }

    if (command.type === 'powerup') {
      this.applyPowerUp(room, round, player, command.kind);
      player.lastCommandId = command.commandId;
      return null;
    }

    const selectedCountryCode = this.resolveAnswer(room, command);
    player.lastCommandId = command.commandId;
    player.answeredMissionId = round.missionId;
    player.pinLocation = command.pinLocation
      ? [command.pinLocation[0], command.pinLocation[1]]
      : null;
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (round.startedAt ?? now));
    round.answers ??= [];
    const isCorrect = selectedCountryCode === round.targetCountryCode;
    const isPinLocate =
      room.config.mode === 'pin' && room.config.pinDirection === 'locate';
    const distanceKm =
      isPinLocate && player.pinLocation
        ? isCorrect
          ? 0
          : round.targetMapAnchor
            ? calculateGreatCircleDistanceKm(
                player.pinLocation,
                round.targetMapAnchor,
              )
            : null
        : null;

    if (isCorrect) {
      const basePoints = this.config.getOrThrow('pointsPerCorrectAnswer');
      const streakBonusPoints = this.config.getOrThrow('streakBonusPoints');
      const roundTimeLimitMs = resolveRoundTimeLimitMs(
        room.config,
        this.config.getOrThrow('roundTimeLimitMs'),
      );
      const speedScoringEnabled = room.config.speedScoring !== false;
      const doublePointsActive =
        player.doubleActiveForMissionId === round.missionId;

      const { streakBonus, totalPoints } = calculateRoundPoints({
        basePoints,
        streak: player.streak,
        streakBonusPoints,
        elapsedMs,
        roundTimeLimitMs,
        speedScoringEnabled,
        doublePointsActive,
      });

      player.score += totalPoints;
      player.streak += 1;
      player.maxStreak = Math.max(player.maxStreak, player.streak);
      round.answers.push({
        playerId,
        elapsedMs,
        correct: true,
        pointsGained: totalPoints,
        streakBonus,
        streakAfter: player.streak,
        ...(distanceKm !== null ? { distanceKm } : {}),
      });
      this.completeRound(room, now);
      return true;
    }

    player.streak = 0;
    const basePoints = this.config.getOrThrow('pointsPerCorrectAnswer');
    const partialBonus =
      isPinLocate && distanceKm !== null
        ? calculateClosestPinBonus(distanceKm, basePoints)
        : 0;
    const penalty = Math.max(0, room.config.wrongAnswerPenalty ?? 0);
    const netDelta = partialBonus - penalty;
    player.score = Math.max(0, player.score + netDelta);

    round.answers.push({
      playerId,
      elapsedMs,
      correct: false,
      pointsGained: partialBonus,
      streakBonus: 0,
      streakAfter: 0,
      ...(distanceKm !== null ? { distanceKm } : {}),
    });
    const connectedPlayers = room.players.filter((member) => member.connected);
    if (
      connectedPlayers.length > 0 &&
      connectedPlayers.every(
        (member) => member.answeredMissionId === round.missionId,
      )
    ) {
      this.completeRound(room, now);
    }
    return false;
  }

  private applyPowerUp(
    room: RoomRecord,
    round: RoomRoundRecord,
    player: RoomPlayerRecord,
    kind: PowerUpKind,
  ): void {
    player.powerUps ??= { ...DEFAULT_PLAYER_POWER_UPS };
    if (!player.powerUps[kind]) {
      throw new RoomDomainError('INVALID_COMMAND');
    }

    switch (kind) {
      case 'fifty': {
        const usesChoices =
          room.config.mode === 'reverse' ||
          (room.config.mode === 'pin' &&
            room.config.pinDirection === 'identify');
        const wrongChoices = round.choices.filter(
          (choice) => choice.countryCode !== round.targetCountryCode,
        );
        if (!usesChoices || wrongChoices.length < 2) {
          throw new RoomDomainError('INVALID_COMMAND');
        }
        const pool = [...wrongChoices];
        const hidden: string[] = [];
        while (hidden.length < 2 && pool.length > 0) {
          const index = randomInt(pool.length);
          const [picked] = pool.splice(index, 1);
          if (picked) hidden.push(picked.id);
        }
        player.hiddenChoiceIdsForMissionId = round.missionId;
        player.hiddenChoiceIds = hidden;
        player.powerUps.fifty = false;
        return;
      }
      case 'hint': {
        const firstLetter = round.targetCountryName.trim().charAt(0).toUpperCase();
        const regionPart = round.targetRegion
          ? `Region: ${round.targetRegion}`
          : '';
        const letterPart = firstLetter ? `Starts with "${firstLetter}"` : '';
        player.hintForMissionId = round.missionId;
        player.hintText = [regionPart, letterPart].filter(Boolean).join(' · ') || 'Hint active';
        player.powerUps.hint = false;
        return;
      }
      case 'double': {
        player.doubleActiveForMissionId = round.missionId;
        player.powerUps.double = false;
        return;
      }
      case 'freeze': {
        if (round.deadlineAt == null) {
          throw new RoomDomainError('INVALID_COMMAND');
        }
        round.deadlineAt += 8_000;
        player.powerUps.freeze = false;
        return;
      }
    }
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
