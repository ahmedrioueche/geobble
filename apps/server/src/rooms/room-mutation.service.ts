import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerConfiguration } from '../config/server-configuration.js';
import {
  ROOM_REPOSITORY,
  type RoomRepository,
} from './domain/room-repository.js';
import { RoomDomainError } from './domain/room-errors.js';
import type { RoomRecord } from './domain/room.types.js';

export interface RoomMutationResult<Result> {
  room: RoomRecord | null;
  result: Result;
}

@Injectable()
export class RoomMutationService {
  private readonly roomLocks = new Map<string, Promise<void>>();

  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly repository: RoomRepository,
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  async update<Result>(
    roomId: string,
    operation: (room: RoomRecord) => Result | Promise<Result>,
  ): Promise<RoomMutationResult<Result>> {
    return this.runExclusive(roomId, async () => {
      const current = await this.repository.findById(roomId);
      if (!current) throw new RoomDomainError('ROOM_NOT_FOUND');
      if (current.expiresAt.getTime() <= Date.now()) {
        await this.repository.delete(roomId);
        throw new RoomDomainError('ROOM_EXPIRED');
      }

      const draft = structuredClone(current);
      const result = await operation(draft);

      if (draft.players.length === 0) {
        await this.repository.delete(roomId);
        return { room: null, result };
      }

      const now = new Date();
      draft.expiresAt = new Date(
        now.getTime() + this.config.getOrThrow('roomExpiryHours') * 60 * 60 * 1000,
      );
      draft.updatedAt = now;
      const updated = await this.repository.compareAndSwap(
        roomId,
        current.revision,
        draft,
      );
      if (!updated) throw new RoomDomainError('STALE_REVISION');

      return { room: updated, result };
    });
  }

  async get(roomId: string): Promise<RoomRecord> {
    const room = await this.repository.findById(roomId);
    if (!room) throw new RoomDomainError('ROOM_NOT_FOUND');
    if (room.expiresAt.getTime() <= Date.now()) {
      await this.repository.delete(roomId);
      throw new RoomDomainError('ROOM_EXPIRED');
    }
    return room;
  }

  async delete(roomId: string): Promise<void> {
    await this.runExclusive(roomId, () => this.repository.delete(roomId));
  }

  private async runExclusive<Result>(
    roomId: string,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const previous = this.roomLocks.get(roomId) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.roomLocks.set(roomId, queued);
    await previous;

    try {
      return await operation();
    } finally {
      release();
      if (this.roomLocks.get(roomId) === queued) {
        this.roomLocks.delete(roomId);
      }
    }
  }
}
