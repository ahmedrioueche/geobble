import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { RoomRepository } from '../domain/room-repository.js';
import type { RoomRecord } from '../domain/room.types.js';
import { ROOM_MODEL, RoomEntity } from './room.schema.js';

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
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord>()
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
            adminPlayerId: replacement.adminPlayerId,
            config: replacement.config,
            pendingConfig: replacement.pendingConfig,
            players: replacement.players,
            game: replacement.game,
            expiresAt: replacement.expiresAt,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      )
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord>()
      .exec();
  }

  async delete(roomId: string): Promise<void> {
    await this.roomModel.deleteOne({ roomId }).exec();
  }

  findExpired(now: Date): Promise<RoomRecord[]> {
    return this.roomModel
      .find({ expiresAt: { $lte: now } })
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord[]>()
      .exec();
  }

  findDueTimers(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.timerDeadlineAt': { $lte: now },
      })
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord[]>()
      .exec();
  }

  findDueAdvances(now: number): Promise<RoomRecord[]> {
    return this.roomModel
      .find({
        status: 'playing',
        'game.advanceAt': { $ne: null, $lte: now },
      })
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
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
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord[]>()
      .exec();
  }

  findRoomsWithConnectedPlayers(): Promise<RoomRecord[]> {
    return this.roomModel
      .find({ 'players.connected': true })
      .select(
        '+players.reconnectTokenHash +game.round.targetCountryCode +game.round.targetCountryName +game.round.choices.countryCode',
      )
      .lean<RoomRecord[]>()
      .exec();
  }
}
