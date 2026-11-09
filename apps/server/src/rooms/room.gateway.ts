import {
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  getConfiguredClientOrigins,
  type ServerConfiguration,
} from '../config/server-configuration.js';
import { RoomDomainError } from './domain/room-errors.js';
import { toRoomSnapshot } from './domain/room-snapshot.js';
import type { RoomRecord, RoomSnapshot } from './domain/room.types.js';
import {
  parseCreateRequest,
  parseJoinRequest,
  parseReactionEmoji,
  parseReconnectRequest,
  parseRoomCommand,
} from './domain/room-validation.js';
import { RoomGameplayService } from './room-gameplay.service.js';
import { RoomLifecycleService } from './room-lifecycle.service.js';
import { RoomRuntimeService } from './room-runtime.service.js';
import {
  ROOM_EVENTS,
  type RoomClientEvents,
  type RoomServerEvents,
  type RoomSocketIdentity,
} from './room-events.js';

interface RoomSocketData extends Record<string, unknown> {
  roomIdentity?: RoomSocketIdentity;
  eventRateLimit?: { windowStartedAt: number; count: number };
  lastReactionAt?: number;
}

type RoomSocket = Socket<
  RoomClientEvents,
  RoomServerEvents,
  Record<string, never>,
  RoomSocketData
>;
type RoomNamespace = Namespace<
  RoomClientEvents,
  RoomServerEvents,
  Record<string, never>,
  RoomSocketData
>;

const getRequestId = (value: unknown): string | null => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'requestId' in value &&
    typeof value.requestId === 'string'
  ) {
    return value.requestId;
  }
  return null;
};

const getCommandId = (value: unknown): number | null => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'commandId' in value &&
    typeof value.commandId === 'number' &&
    Number.isSafeInteger(value.commandId)
  ) {
    return value.commandId;
  }
  return null;
};

@WebSocketGateway({
  namespace: '/rooms',
  cors: {
    origin: (origin, callback) => {
      callback(
        null,
        origin === undefined || getConfiguredClientOrigins().includes(origin),
      );
    },
    credentials: true,
  },
  maxHttpBufferSize: 64 * 1024,
})
export class RoomGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RoomGateway.name);
  private readonly playerSockets = new Map<string, RoomSocket>();
  private runtimeTimer: NodeJS.Timeout | null = null;

  @WebSocketServer()
  private namespace!: RoomNamespace;

  constructor(
    private readonly lifecycle: RoomLifecycleService,
    private readonly gameplay: RoomGameplayService,
    private readonly runtime: RoomRuntimeService,
    private readonly config: ConfigService<ServerConfiguration, true>,
  ) {}

  afterInit(): void {
    this.logger.log('Socket.IO room namespace initialized');
  }

  onModuleInit(): void {
    this.runtimeTimer = setInterval(() => {
      void this.publishRuntimeUpdates();
    }, 1_000);
    this.runtimeTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.runtimeTimer) clearInterval(this.runtimeTimer);
  }

  handleDisconnect(client: RoomSocket): void {
    const identity = client.data.roomIdentity;
    if (!identity) return;
    delete client.data.roomIdentity;
    const key = this.getPlayerSocketKey(identity.roomId, identity.playerId);
    if (this.playerSockets.get(key) === client) {
      this.playerSockets.delete(key);
    }
    void this.markDisconnected(identity);
  }

  @SubscribeMessage(ROOM_EVENTS.create)
  async create(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const requestId = getRequestId(value);
    await this.handleRequest(client, requestId, async () => {
      if (client.data.roomIdentity) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const request = parseCreateRequest(value);
      const joined = await this.lifecycle.createRoom(request);
      await this.attachPlayerSocket(client, {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
        reconnectToken: joined.reconnectToken,
      });
      client.emit(ROOM_EVENTS.joined, {
        requestId: request.requestId,
        ...joined,
      });
    });
  }

  @SubscribeMessage(ROOM_EVENTS.matchmake)
  async matchmake(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const requestId = getRequestId(value);
    await this.handleRequest(
      client,
      requestId,
      async () => {
        if (client.data.roomIdentity) {
          throw new RoomDomainError('INVALID_REQUEST');
        }
        const request = parseCreateRequest(value);
        const joined = await this.lifecycle.joinPublicRoom(request);
        await this.attachPlayerSocket(client, {
          roomId: joined.snapshot.roomId,
          playerId: joined.playerId,
          reconnectToken: joined.reconnectToken,
        });
        client.emit(ROOM_EVENTS.joined, {
          requestId: request.requestId,
          ...joined,
        });
        client.to(joined.snapshot.roomId).emit(ROOM_EVENTS.updated, joined.snapshot);
      },
      'Public matchmaking is temporarily unavailable. Please try again.',
    );
  }

  @SubscribeMessage(ROOM_EVENTS.join)
  async join(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const requestId = getRequestId(value);
    await this.handleRequest(client, requestId, async () => {
      if (client.data.roomIdentity) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const request = parseJoinRequest(value);
      const joined = await this.lifecycle.joinRoom(request);
      await this.attachPlayerSocket(client, {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
        reconnectToken: joined.reconnectToken,
      });
      client.emit(ROOM_EVENTS.joined, {
        requestId: request.requestId,
        ...joined,
      });
      client.to(joined.snapshot.roomId).emit(ROOM_EVENTS.updated, joined.snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.reconnect)
  async reconnect(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const requestId = getRequestId(value);
    await this.handleRequest(client, requestId, async () => {
      if (client.data.roomIdentity) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const request = parseReconnectRequest(value);
      const joined = await this.lifecycle.reconnect(request);
      await this.attachPlayerSocket(client, {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
        reconnectToken: joined.reconnectToken,
      });
      client.emit(ROOM_EVENTS.joined, {
        requestId: request.requestId,
        ...joined,
      });
      client.to(joined.snapshot.roomId).emit(ROOM_EVENTS.updated, joined.snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.ready)
  async setReady(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    await this.handleRequest(client, getRequestId(value), async () => {
      if (!identity || !this.isReadyRequest(value)) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const snapshot = await this.lifecycle.setReady(
        identity.roomId,
        identity.playerId,
        value.ready,
      );
      this.namespace.to(identity.roomId).emit(ROOM_EVENTS.updated, snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.pause)
  async setPaused(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    await this.handleRequest(client, getRequestId(value), async () => {
      if (!identity || !this.isPauseRequest(value)) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const snapshot = await this.lifecycle.setPaused(
        identity.roomId,
        identity.playerId,
        value.paused,
      );
      this.namespace.to(identity.roomId).emit(ROOM_EVENTS.updated, snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.start)
  async start(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    await this.handleRequest(client, getRequestId(value), async () => {
      if (!identity) throw new RoomDomainError('NOT_CONNECTED');
      const snapshot = await this.lifecycle.startRoom(
        identity.roomId,
        identity.playerId,
      );
      this.namespace.to(identity.roomId).emit(ROOM_EVENTS.updated, snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.changeSettings)
  async changeSettings(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    const requestId = getRequestId(value);
    await this.handleRequest(client, requestId, async () => {
      if (!identity || !requestId || !this.isSettingsRequest(value)) {
        throw new RoomDomainError('INVALID_REQUEST');
      }
      const result = await this.lifecycle.changeSettings(
        identity.roomId,
        identity.playerId,
        value.config,
      );
      this.namespace
        .to(identity.roomId)
        .emit(ROOM_EVENTS.updated, result.snapshot);
      client.emit(ROOM_EVENTS.settingsAccepted, {
        requestId,
        roomId: identity.roomId,
        queued: result.queued,
        revision: result.snapshot.revision,
      });
    });
  }

  @SubscribeMessage(ROOM_EVENTS.command)
  async command(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    const commandId = getCommandId(value);
    await this.handleRequest(client, null, async () => {
      if (!identity) throw new RoomDomainError('NOT_CONNECTED');
      let command;
      try {
        command = parseRoomCommand(value);
      } catch {
        client.emit(ROOM_EVENTS.commandRejected, {
          roomId: identity.roomId,
          commandId,
          reason: 'invalid-command',
        });
        return;
      }

      const outcome = await this.gameplay.submitCommand(
        identity.roomId,
        identity.playerId,
        command,
      );
      if (outcome.accepted) {
        this.broadcastRoomSnapshot(identity.roomId, outcome.roomRecord, outcome.snapshot);
        client.emit(ROOM_EVENTS.commandAccepted, {
          roomId: identity.roomId,
          commandId: outcome.commandId,
          revision: outcome.snapshot.revision,
          answerResult: outcome.answerResult,
        });
        return;
      }

      client.emit(ROOM_EVENTS.commandRejected, {
        roomId: identity.roomId,
        commandId: outcome.commandId,
        reason: outcome.reason,
        revision: outcome.snapshot.revision,
      });
      client.emit(ROOM_EVENTS.updated, outcome.snapshot);
    });
  }

  @SubscribeMessage(ROOM_EVENTS.reaction)
  async reaction(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    if (!identity) return;
    const now = Date.now();
    if (
      client.data.lastReactionAt !== undefined &&
      now - client.data.lastReactionAt < 800
    ) {
      return;
    }
    try {
      this.enforceEventRate(client);
      const emoji = parseReactionEmoji(value);
      const snapshot = await this.lifecycle.getSnapshot(
        identity.roomId,
        identity.playerId,
      );
      const player = snapshot.players.find(
        (member) => member.id === identity.playerId,
      );
      if (!player) return;
      client.data.lastReactionAt = now;
      this.namespace.to(identity.roomId).emit(ROOM_EVENTS.reaction, {
        roomId: identity.roomId,
        playerId: player.id,
        playerName: player.name,
        emoji,
        timestamp: now,
      });
    } catch {
      // Ignore invalid or throttled ephemeral reactions.
    }
  }

  @SubscribeMessage(ROOM_EVENTS.leave)
  async leave(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() value: unknown,
  ): Promise<void> {
    const identity = client.data.roomIdentity;
    await this.handleRequest(client, getRequestId(value), async () => {
      if (!identity) throw new RoomDomainError('NOT_CONNECTED');
      const result = await this.lifecycle.leaveRoom(
        identity.roomId,
        identity.playerId,
      );
      await client.leave(identity.roomId);
      delete client.data.roomIdentity;
      const key = this.getPlayerSocketKey(identity.roomId, identity.playerId);
      if (this.playerSockets.get(key) === client) {
        this.playerSockets.delete(key);
      }
      if (result.snapshot) {
        this.namespace
          .to(identity.roomId)
          .emit(ROOM_EVENTS.updated, result.snapshot);
      } else {
        this.namespace.to(identity.roomId).emit(ROOM_EVENTS.closed, {
          roomId: identity.roomId,
        });
      }
      client.emit(ROOM_EVENTS.left, { roomId: identity.roomId });
    });
  }

  private broadcastRoomSnapshot(
    roomId: string,
    roomRecord: RoomRecord,
    fallbackSnapshot: RoomSnapshot,
  ): void {
    let emittedAny = false;
    for (const player of roomRecord.players) {
      const socket = this.playerSockets.get(
        this.getPlayerSocketKey(roomId, player.playerId),
      );
      if (!socket) continue;
      emittedAny = true;
      socket.emit(
        ROOM_EVENTS.updated,
        toRoomSnapshot(roomRecord, player.playerId),
      );
    }
    if (!emittedAny) {
      this.namespace.to(roomId).emit(ROOM_EVENTS.updated, fallbackSnapshot);
    }
  }

  private async markDisconnected(identity: RoomSocketIdentity): Promise<void> {
    try {
      const snapshot = await this.lifecycle.markDisconnected(
        identity.roomId,
        identity.playerId,
        identity.reconnectToken,
      );
      if (snapshot) {
        this.namespace.to(identity.roomId).emit(ROOM_EVENTS.updated, snapshot);
      }
    } catch (error) {
      this.logUnexpectedError('disconnect handling', error);
    }
  }

  private async publishRuntimeUpdates(): Promise<void> {
    try {
      const result = await this.runtime.tick();
      for (const snapshot of result.snapshots) {
        this.namespace
          .to(snapshot.roomId)
          .emit(ROOM_EVENTS.updated, snapshot);
      }
      for (const roomId of result.removedRoomIds) {
        this.namespace.to(roomId).emit(ROOM_EVENTS.closed, { roomId });
      }
    } catch (error) {
      this.logUnexpectedError('room maintenance', error);
    }
  }

  private async handleRequest(
    client: RoomSocket,
    requestId: string | null,
    operation: () => Promise<void>,
    fallbackMessage = 'The server could not complete the room request.',
  ): Promise<void> {
    try {
      this.enforceEventRate(client);
      await operation();
    } catch (error) {
      const message =
        error instanceof RoomDomainError
          ? error.message
          : fallbackMessage;
      if (!(error instanceof RoomDomainError)) {
        this.logUnexpectedError('room request', error);
      }
      client.emit(ROOM_EVENTS.error, {
        requestId,
        message,
        ...(error instanceof RoomDomainError ? { code: error.code } : {}),
      });
    }
  }

  private async attachPlayerSocket(
    client: RoomSocket,
    identity: RoomSocketIdentity,
  ): Promise<void> {
    await client.join(identity.roomId);
    const key = this.getPlayerSocketKey(identity.roomId, identity.playerId);
    const previous = this.playerSockets.get(key);

    client.data.roomIdentity = identity;
    this.playerSockets.set(key, client);

    if (previous && previous.id !== client.id) {
      delete previous.data.roomIdentity;
      previous.disconnect(true);
    }
  }

  private getPlayerSocketKey(roomId: string, playerId: string): string {
    return `${roomId}:${playerId}`;
  }

  private enforceEventRate(client: RoomSocket): void {
    const now = Date.now();
    const rateLimit = client.data.eventRateLimit;
    if (!rateLimit || now - rateLimit.windowStartedAt >= 60_000) {
      client.data.eventRateLimit = { windowStartedAt: now, count: 1 };
      return;
    }

    if (rateLimit.count >= this.config.getOrThrow('socketEventsPerMinute')) {
      throw new RoomDomainError('RATE_LIMITED');
    }
    rateLimit.count += 1;
  }

  private isReadyRequest(value: unknown): value is { ready: boolean } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ready' in value &&
      typeof value.ready === 'boolean'
    );
  }

  private isPauseRequest(value: unknown): value is { paused: boolean } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'paused' in value &&
      typeof value.paused === 'boolean'
    );
  }

  private isSettingsRequest(
    value: unknown,
  ): value is { config: unknown } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'config' in value
    );
  }

  private logUnexpectedError(context: string, error: unknown): void {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    this.logger.error(`Unexpected ${context} failure (${errorName})`);
  }
}
