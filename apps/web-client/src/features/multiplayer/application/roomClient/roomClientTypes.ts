import type {
  ReactionEmoji,
  RoomCommandInput,
  RoomConfiguration,
  RoomErrorCode,
  RoomInspectResult,
  RoomReactionEvent,
  RoomSettingsVoteResolvedEvent,
  RoomSnapshot,
} from "../../contracts/multiplayerRoomProtocol";
import type { RoomTransportListener } from "../../infrastructure/socketIoRoomTransport";

export const REQUEST_TIMEOUT_MS = 12_000;

export const TERMINAL_RECONNECT_ERROR_CODES: RoomErrorCode[] = [
  "NOT_AUTHORIZED",
  "ROOM_NOT_FOUND",
  "ROOM_EXPIRED",
];

export interface StoredRoomCredentials {
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

export class RoomRequestFailure extends Error {
  readonly code?: RoomErrorCode;

  constructor(message: string, code?: RoomErrorCode) {
    super(message);
    this.name = "RoomRequestFailure";
    this.code = code;
  }
}

export interface ActiveRoom {
  playerId: string;
  snapshot: RoomSnapshot;
  roomSecret?: string;
}

export interface RoomClientState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
  room: ActiveRoom | null;
  pendingCommandIds: number[];
  lastAcknowledgedRevision: number | null;
  lastAnswerResult: boolean | null;
  settingsAccepted: { queued: boolean; revision: number } | null;
  lastVoteResolved: RoomSettingsVoteResolvedEvent | null;
  lastReaction: RoomReactionEvent | null;
  error: string | null;
  reconnectAvailable: boolean;
  reconnectRequired: boolean;
}

export interface RoomTransport {
  connect: (listener: RoomTransportListener) => Promise<void>;
  emit: (eventName: string, payload: unknown) => void;
  disconnect: () => void;
}

export interface RoomCredentialStorage {
  read: () => StoredRoomCredentials | null;
  write: (credentials: StoredRoomCredentials) => void;
  clear: () => void;
}

export interface RoomClient {
  getState: () => RoomClientState;
  subscribe: (listener: (state: RoomClientState) => void) => () => void;
  resume: () => Promise<void>;
  retryReconnect: () => Promise<void>;
  inspectRoom: (roomId: string) => Promise<RoomInspectResult>;
  createRoom: (
    playerName: string,
    config?: RoomConfiguration,
    visibility?: "public" | "private",
    secret?: string,
  ) => Promise<void>;
  joinRoom: (
    roomId: string,
    playerName: string,
    secret?: string,
  ) => Promise<void>;
  joinPublicRoom: (playerName: string) => Promise<void>;
  setPaused: (paused: boolean) => void;
  startRoom: () => void;
  changeSettings: (config: RoomConfiguration) => Promise<void>;
  proposeSettings: (config: RoomConfiguration) => Promise<void>;
  voteSettings: (voteId: string, approve: boolean) => Promise<void>;
  submitCommand: (command: RoomCommandInput) => Promise<number>;
  sendReaction: (emoji: ReactionEmoji) => void;
  leaveRoom: () => Promise<void>;
  forgetReconnect: () => void;
  disconnect: () => void;
}
