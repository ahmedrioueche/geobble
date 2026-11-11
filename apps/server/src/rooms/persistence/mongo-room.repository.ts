import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { RoomRepository } from '../domain/room-repository.js';
import type { RoomRecord } from '../domain/room.types.js';
import { ROOM_MODEL, RoomEntity } from './room.schema.js';

const ROOM_PRIVATE_SELECT =
  '+secret +secretHash +players.reconnectTokenHash +players.hiddenChoiceIdsForMissionId +players.hiddenChoiceIds +players.hintForMissionId +players.hintText +game.round.targetCountryCode +game.round.targetCountryName +game.round.targetRegion +game.round.targetSubregion +game.round.targetCapital +game.round.targetFlag +game.round.targetMapAnchor +game.round.choices.countryCode';

@Injectable()
export class MongoRoomRepository implements RoomRepository {
  constructor(
    @InjectModel(ROOM_MODEL)
    private readonly roomModel: Model<RoomEntity>,
  ) {}

  async create(room: RoomRecord): Promise<void> {
    await this.roomModel.create(room);
  }

  findById(roomId: string): Promise<RoomRecord | null> {
    return this.roomModel
      .findOne({ roomId })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord>()
      .exec();
  }

  findAvailablePublicRooms(maxPlayers: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        visibility: 'public',
        status: { $in: ['waiting', 'playing'] },
        expiresAt: { $gt: new Date() },
        'players.connected': true,
        $expr: { $lt: [{ $size: '$players' }, maxPlayers] },
      })
      .sort({ updatedAt: 1 })
      .limit(50)
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  compareAndSwap(
    roomId: string,
    expectedRevision: number,
    replacement: RoomRecord,
  ): Promise<RoomRecord | null> {
    return this.roomModel
      .findOneAndUpdate(
        { roomId, revision: expectedRevision },
        {
          $set: {
            revision: expectedRevision + 1,
            status: replacement.status,
            visibility: replacement.visibility ?? 'private',
            adminPlayerId: replacement.adminPlayerId,
            config: replacement.config,
            pendingConfig: replacement.pendingConfig,
            players: replacement.players,
            game: replacement.game,
            lastActivityAt: replacement.lastActivityAt,
            expiresAt: replacement.expiresAt,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord>()
      .exec();
  }

  async delete(roomId: string): Promise<void> {
    await this.roomModel.deleteOne({ roomId }).exec();
  }

  findExpired(now: Date): Promise<RoomRecord[]> {
    return this.roomModel
      .find({ expiresAt: { $lte: now } })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findDueTimers(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.timerDeadlineAt': { $lte: now },
      })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findDueAdvances(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.advanceAt': { $ne: null, $lte: now },
      })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findDueRoundDeadlines(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.advanceAt': null,
        'game.round.revealed': false,
        'game.round.deadlineAt': { $ne: null, $lte: now },
      })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findDuePauseDeadlines(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.paused': true,
        'game.pauseDeadlineAt': { $ne: null, $lte: now },
      })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findExpiredDisconnects(cutoffAt: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        players: {
          $elemMatch: {
            connected: false,
            disconnectedAt: { $ne: null, $lte: cutoffAt },
          },
        },
      })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }

  findRoomsWithConnectedPlayers(): Promise<RoomRecord[]> {
    return this.roomModel
      .find({ 'players.connected': true })
      .select(ROOM_PRIVATE_SELECT)
      .lean<RoomRecord[]>()
      .exec();
  }
}
