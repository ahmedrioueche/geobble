import type { RoomRepository } from '../../src/rooms/domain/room-repository.js';
import type { RoomRecord } from '../../src/rooms/domain/room.types.js';

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomRecord>();

  async create(room: RoomRecord): Promise<void> {
    this.rooms.set(room.roomId, structuredClone(room));
  }

  async findById(roomId: string): Promise<RoomRecord | null> {
    const room = this.rooms.get(roomId);
    return room ? structuredClone(room) : null;
  }

  async compareAndSwap(
    roomId: string,
    expectedRevision: number,
    replacement: RoomRecord,
  ): Promise<RoomRecord | null> {
    const current = this.rooms.get(roomId);
    if (!current || current.revision !== expectedRevision) return null;
    const updated = structuredClone(replacement);
    updated.revision = expectedRevision + 1;
    updated.updatedAt = new Date();
    this.rooms.set(roomId, updated);
    return structuredClone(updated);
  }

  async delete(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  async findExpired(now: Date): Promise<RoomRecord[]> {
    return [...this.rooms.values()]
      .filter((room) => room.expiresAt <= now)
      .map((room) => structuredClone(room));
  }

  async findDueTimers(now: number): Promise<RoomRecord[]> {
    return [...this.rooms.values()]
      .filter(
        (room) =>
          room.status === 'playing' &&
          room.game.timerDeadlineAt !== null &&
          room.game.timerDeadlineAt <= now,
      )
      .map((room) => structuredClone(room));
  }

  async findDueAdvances(now: number): Promise<RoomRecord[]> {
    return [...this.rooms.values()]
      .filter(
        (room) =>
          room.status === 'playing' &&
          room.game.advanceAt !== null &&
          room.game.advanceAt <= now,
      )
      .map((room) => structuredClone(room));
  }

  async findExpiredDisconnects(cutoffAt: number): Promise<RoomRecord[]> {
    return [...this.rooms.values()]
      .filter((room) =>
        room.players.some(
          (player) =>
            !player.connected &&
            player.disconnectedAt !== null &&
            player.disconnectedAt <= cutoffAt,
        ),
      )
      .map((room) => structuredClone(room));
  }

  async findRoomsWithConnectedPlayers(): Promise<RoomRecord[]> {
    return [...this.rooms.values()]
      .filter((room) => room.players.some((player) => player.connected))
      .map((room) => structuredClone(room));
  }
}
