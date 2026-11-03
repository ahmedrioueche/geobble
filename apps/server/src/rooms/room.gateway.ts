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
import { parseCreateRequest, parseJoinRequest, parseReconnectRequest, parseRoomCommand } from './domain/room-validation.js';
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
      await client.join(joined.snapshot.roomId);
      client.data.roomIdentity = {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
      };
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
        await client.join(joined.snapshot.roomId);
        client.data.roomIdentity = {
          roomId: joined.snapshot.roomId,
          playerId: joined.playerId,
        };
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
      await client.join(joined.snapshot.roomId);
      client.data.roomIdentity = {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
      };
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
      await client.join(joined.snapshot.roomId);
      client.data.roomIdentity = {
        roomId: joined.snapshot.roomId,
        playerId: joined.playerId,
      };
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
        this.namespace
          .to(identity.roomId)
          .emit(ROOM_EVENTS.updated, outcome.snapshot);
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

  private async markDisconnected(identity: RoomSocketIdentity): Promise<void> {
    try {
      const snapshot = await this.lifecycle.markDisconnected(
        identity.roomId,
        identity.playerId,
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
      client.emit(ROOM_EVENTS.error, { requestId, message });
    }
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
