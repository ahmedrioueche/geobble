import type {
  RoomCommand,
  RoomConfiguration,
  RoomCreateRequest,
  RoomJoinRequest,
  RoomReconnectRequest,
  RoomSnapshot,
} from './domain/room.types.js';

export const ROOM_EVENTS = {
  create: 'room:create',
  join: 'room:join',
  matchmake: 'room:matchmake',
  reconnect: 'room:reconnect',
  ready: 'room:ready',
  start: 'room:start',
  changeSettings: 'room:change-settings',
  command: 'room:command',
  leave: 'room:leave',
  joined: 'room:joined',
  updated: 'room:updated',
  commandAccepted: 'room:command-accepted',
  commandRejected: 'room:command-rejected',
  settingsAccepted: 'room:settings-accepted',
  left: 'room:left',
  closed: 'room:closed',
  error: 'room:error',
} as const;

export interface RoomSocketIdentity {
  roomId: string;
  playerId: string;
}

export interface RoomRequestError {
  requestId: string | null;
  message: string;
}

export interface RoomClientEvents {
  'room:create': (payload: RoomCreateRequest) => void;
  'room:join': (payload: RoomJoinRequest) => void;
  'room:matchmake': (payload: RoomCreateRequest) => void;
  'room:reconnect': (payload: RoomReconnectRequest) => void;
  'room:ready': (payload: { requestId: string; ready: boolean }) => void;
  'room:start': (payload: { requestId: string }) => void;
  'room:change-settings': (payload: {
    requestId: string;
    config: RoomConfiguration;
  }) => void;
  'room:command': (payload: RoomCommand) => void;
  'room:leave': (payload: { requestId: string }) => void;
}

export interface RoomServerEvents {
  'room:joined': (payload: {
    requestId: string;
    playerId: string;
    reconnectToken: string;
    nextCommandId: number;
    snapshot: RoomSnapshot;
  }) => void;
  'room:updated': (snapshot: RoomSnapshot) => void;
  'room:command-accepted': (payload: {
    roomId: string;
    commandId: number;
    revision: number;
    answerResult: boolean | null;
  }) => void;
  'room:command-rejected': (payload: {
    roomId: string;
    commandId: number | null;
    reason: string;
    revision?: number;
  }) => void;
  'room:settings-accepted': (payload: {
    roomId: string;
    queued: boolean;
    revision: number;
  }) => void;
  'room:left': (payload: { roomId: string }) => void;
  'room:closed': (payload: { roomId: string }) => void;
  'room:error': (payload: RoomRequestError) => void;
}
