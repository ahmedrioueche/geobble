import type { RoomRecord } from './room.types.js';

export const ROOM_REPOSITORY = Symbol('ROOM_REPOSITORY');

export interface RoomRepository {
  create(room: RoomRecord): Promise<void>;
  findById(roomId: string): Promise<RoomRecord | null>;
  compareAndSwap(
    roomId: string,
    expectedRevision: number,
    replacement: RoomRecord,
  ): Promise<RoomRecord | null>;
  delete(roomId: string): Promise<void>;
  findExpired(now: Date): Promise<RoomRecord[]>;
  findDueTimers(now: number): Promise<RoomRecord[]>;
  findDueAdvances(now: number): Promise<RoomRecord[]>;
  findExpiredDisconnects(cutoffAt: number): Promise<RoomRecord[]>;
  findRoomsWithConnectedPlayers(): Promise<RoomRecord[]>;
}
