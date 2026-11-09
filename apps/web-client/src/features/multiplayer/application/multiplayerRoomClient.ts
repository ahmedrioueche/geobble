import type {
  ReactionEmoji,
  RoomCommand,
  RoomCommandInput,
  RoomConfiguration,
  RoomErrorCode,
  RoomJoinedEvent,
  RoomReactionEvent,
  RoomServerEvent,
  RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import {
  SocketIoRoomTransport,
  type RoomTransportListener,
  type RoomTransportStatus,
} from "../infrastructure/socketIoRoomTransport";

import { createGameSessionId } from "../../game/domain/gameSession";

const CREDENTIALS_KEY = "geobble.multiplayer.reconnect";
const REQUEST_TIMEOUT_MS = 12_000;
const TERMINAL_RECONNECT_ERROR_CODES: RoomErrorCode[] = [
  "NOT_AUTHORIZED",
  "ROOM_NOT_FOUND",
  "ROOM_EXPIRED",
];

interface StoredRoomCredentials {
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

class RoomRequestFailure extends Error {
  readonly code?: RoomErrorCode;

  constructor(
    message: string,
    code?: RoomErrorCode,
  ) {
    super(message);
    this.name = "RoomRequestFailure";
    this.code = code;
  }
}

export interface ActiveRoom {
  playerId: string;
  snapshot: RoomSnapshot;
}

export interface RoomClientState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
  room: ActiveRoom | null;
  pendingCommandIds: number[];
  lastAcknowledgedRevision: number | null;
  lastAnswerResult: boolean | null;
  settingsAccepted: { queued: boolean; revision: number } | null;
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
  createRoom: (
    playerName: string,
    config?: RoomConfiguration,
    visibility?: "public" | "private",
  ) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  joinPublicRoom: (playerName: string) => Promise<void>;
  setReady: (ready: boolean) => void;
  setPaused: (paused: boolean) => void;
  startRoom: () => void;
  changeSettings: (config: RoomConfiguration) => Promise<void>;
  submitCommand: (command: RoomCommandInput) => Promise<number>;
  sendReaction: (emoji: ReactionEmoji) => void;
  leaveRoom: () => Promise<void>;
  forgetReconnect: () => void;
  disconnect: () => void;
}

const getBrowserStorage = (): RoomCredentialStorage => ({
  read: () => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("roomId" in parsed) ||
      typeof parsed.roomId !== "string" ||
      !("playerId" in parsed) ||
      typeof parsed.playerId !== "string" ||
      !("reconnectToken" in parsed) ||
      typeof parsed.reconnectToken !== "string"
    ) {
      window.localStorage.removeItem(CREDENTIALS_KEY);
      return null;
    }
    return {
      roomId: parsed.roomId,
      playerId: parsed.playerId,
      reconnectToken: parsed.reconnectToken,
    };
  },
  write: (credentials) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  },
  clear: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CREDENTIALS_KEY);
    }
  },
});

const makeRequestId = (): string => createGameSessionId();

export const createRoomClient = (
  transport: RoomTransport = new SocketIoRoomTransport(),
  storage: RoomCredentialStorage = getBrowserStorage(),
  createId: () => string = makeRequestId,
): RoomClient => {
  const listeners = new Set<(state: RoomClientState) => void>();
  const pendingJoins = new Map<
    string,
    {
      resolve: (event: RoomJoinedEvent) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  const pendingSettings = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  let credentials: StoredRoomCredentials | null = null;
  let nextCommandId = 1;
  let transportConnected = false;
  let connecting: Promise<void> | null = null;
  let reconnecting = false;
  let reconnectRequestId: string | null = null;
  let leaving:
    | { roomId: string; resolve: () => void; timeout: ReturnType<typeof setTimeout> }
    | null = null;
  let state: RoomClientState = {
    status: "disconnected",
    room: null,
    pendingCommandIds: [],
    lastAcknowledgedRevision: null,
    lastAnswerResult: null,
    settingsAccepted: null,
    lastReaction: null,
    error: null,
    reconnectAvailable: false,
    reconnectRequired: false,
  };

  try {
    credentials = storage.read();
    state = {
      ...state,
      reconnectAvailable: credentials !== null,
      reconnectRequired: credentials !== null,
    };
  } catch {
    state = {
      ...state,
      error: "Reconnect details could not be read from this browser.",
    };
  }

  const updateState = (changes: Partial<RoomClientState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener(state);
  };

  const rejectPendingJoins = (
    requestId: string | null,
    message: string,
    code?: RoomErrorCode,
  ) => {
    if (requestId) {
      const pending = pendingJoins.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingJoins.delete(requestId);
        pending.reject(new RoomRequestFailure(message, code));
      }
      return;
    }
    for (const pending of pendingJoins.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new RoomRequestFailure(message, code));
    }
    pendingJoins.clear();
  };

  const acceptJoinedRoom = (event: RoomJoinedEvent) => {
    const pending = pendingJoins.get(event.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingJoins.delete(event.requestId);
    credentials = {
      roomId: event.snapshot.roomId,
      playerId: event.playerId,
      reconnectToken: event.reconnectToken,
    };
    nextCommandId = event.nextCommandId;
    try {
      storage.write(credentials);
      updateState({
        status: "connected",
        room: { playerId: event.playerId, snapshot: event.snapshot },
        pendingCommandIds: [],
        lastAcknowledgedRevision: null,
        lastAnswerResult: null,
        reconnectAvailable: true,
        reconnectRequired: false,
        error: null,
      });
      pending.resolve(event);
    } catch {
      updateState({
        status: "connected",
        room: { playerId: event.playerId, snapshot: event.snapshot },
        reconnectAvailable: false,
        reconnectRequired: false,
        error: "Room joined, but reconnect details could not be saved.",
      });
      pending.resolve(event);
    }
  };

  const beginReconnect = async () => {
    if (!credentials || reconnecting || !transportConnected) return;
    reconnecting = true;
    const requestId = createId();
    reconnectRequestId = requestId;
    const reconnectCredentials = credentials;
    updateState({
      status: "reconnecting",
      reconnectRequired: true,
      error: null,
    });
    try {
      await requestRoomJoin(requestId, "room:reconnect", {
        requestId,
        ...reconnectCredentials,
      });
    } catch (error) {
      if (
        error instanceof RoomRequestFailure &&
        error.code !== undefined &&
        TERMINAL_RECONNECT_ERROR_CODES.includes(error.code)
      ) {
        return;
      }
      updateState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to reconnect to the room.",
      });
    } finally {
      if (reconnectRequestId === requestId) reconnectRequestId = null;
      reconnecting = false;
    }
  };

  const handleEvent = (event: RoomServerEvent) => {
    switch (event.type) {
      case "joined":
        acceptJoinedRoom(event.payload);
        return;
      case "updated":
        if (
          !state.room ||
          state.room.snapshot.roomId !== event.snapshot.roomId ||
          event.snapshot.revision <= state.room.snapshot.revision
        ) {
          return;
        }
        updateState({
          room: { ...state.room, snapshot: event.snapshot },
          lastAnswerResult: null,
          error: null,
        });
        return;
      case "command-accepted":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        updateState({
          pendingCommandIds: state.pendingCommandIds.filter(
            (id) => id !== event.payload.commandId,
          ),
          lastAcknowledgedRevision: event.payload.revision,
          lastAnswerResult: event.payload.answerResult,
          error: null,
        });
        return;
      case "command-rejected":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        updateState({
          pendingCommandIds:
            event.payload.commandId === null
              ? []
              : state.pendingCommandIds.filter(
                (id) => id !== event.payload.commandId,
              ),
          error: `Command rejected: ${event.payload.reason}.`,
        });
        return;
      case "settings-accepted":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        {
          const pending = pendingSettings.get(event.payload.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingSettings.delete(event.payload.requestId);
            pending.resolve();
          }
        }
        updateState({
          settingsAccepted: {
            queued: event.payload.queued,
            revision: event.payload.revision,
          },
        });
        return;
      case "reaction":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        updateState({ lastReaction: event.payload });
        return;
      case "error":
        rejectPendingJoins(
          event.payload.requestId,
          event.payload.message,
          event.payload.code,
        );
        if (event.payload.requestId) {
          const pending = pendingSettings.get(event.payload.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingSettings.delete(event.payload.requestId);
            pending.reject(new Error(event.payload.message));
          }
        }
        if (event.payload.requestId !== null) {
          if (event.payload.requestId === reconnectRequestId) {
            const terminalReconnectError = event.payload.code
              ? TERMINAL_RECONNECT_ERROR_CODES.includes(event.payload.code)
              : false;
            if (terminalReconnectError) {
              invalidateReconnectSession();
            }
            return;
          }
          updateState({
            status: state.room
              ? "connected"
              : transportConnected
                ? "connected"
                : "disconnected",
            error: event.payload.message,
          });
          return;
        }
        updateState({
          error: event.payload.message,
        });
        return;
      case "left":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        if (leaving) {
          clearTimeout(leaving.timeout);
          leaving.resolve();
          leaving = null;
        }
        credentials = null;
        try {
          storage.clear();
        } catch {
          updateState({ error: "Room left, but reconnect details could not be cleared." });
        }
        updateState({
          status: "disconnected",
          room: null,
          pendingCommandIds: [],
          reconnectAvailable: false,
          reconnectRequired: false,
        });
        return;
      case "closed":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        if (leaving) {
          clearTimeout(leaving.timeout);
          leaving.resolve();
          leaving = null;
        }
        credentials = null;
        try {
          storage.clear();
        } catch {
          updateState({ error: "Room closed, but reconnect details could not be cleared." });
        }
        updateState({
          status: "error",
          room: null,
          pendingCommandIds: [],
          reconnectAvailable: false,
          reconnectRequired: false,
          error: "This room has closed.",
        });
    }
  };

  const listener: RoomTransportListener = {
    onEvent: handleEvent,
    onStatusChange: (status: RoomTransportStatus) => {
      if (status === "connected") {
        transportConnected = true;
        if (credentials) {
          void beginReconnect();
        } else if (!state.room) {
          updateState({ status: "connected", error: null });
        }
        return;
      }
      transportConnected = false;
      updateState({
        status: status === "reconnecting" ? "reconnecting" : "disconnected",
        reconnectRequired: credentials !== null,
      });
    },
    onError: (error) => updateState({ error: error.message }),
  };

  const connectTransport = async () => {
    if (transportConnected) return;
    if (!connecting) {
      updateState({ status: "connecting", error: null });
      connecting = transport
        .connect(listener)
        .then(() => {
          transportConnected = true;
        })
        .catch((error: unknown) => {
          updateState({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Could not connect to the room server.",
          });
          throw error;
        })
        .finally(() => {
          connecting = null;
        });
    }
    await connecting;
  };

  const requestRoomJoin = (
    requestId: string,
    eventName: string,
    payload: unknown,
  ): Promise<RoomJoinedEvent> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingJoins.delete(requestId);
        reject(new Error("The room server did not respond in time."));
      }, REQUEST_TIMEOUT_MS);
      pendingJoins.set(requestId, { resolve, reject, timeout });
      try {
        transport.emit(eventName, payload);
      } catch (error) {
        clearTimeout(timeout);
        pendingJoins.delete(requestId);
        reject(
          error instanceof Error
            ? error
            : new Error("Could not send the room request."),
        );
      }
    });

  const clearSavedReconnect = () => {
    if (!credentials) return;
    try {
      storage.clear();
    } catch {
      const error = new Error("Saved room details could not be cleared.");
      updateState({ error: error.message });
      throw error;
    }
    credentials = null;
    reconnectRequestId = null;
    reconnecting = false;
    updateState({
      reconnectAvailable: false,
      reconnectRequired: false,
      error: null,
    });
  };

  const invalidateReconnectSession = () => {
    credentials = null;
    reconnectRequestId = null;
    reconnecting = false;
    let error = "Your saved room session is no longer valid. Join or create a room.";
    try {
      storage.clear();
    } catch {
      error =
        "Your saved room session is no longer valid, but its saved details could not be cleared.";
    }

    for (const [requestId, pending] of pendingSettings) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("The saved room session is no longer valid."));
      pendingSettings.delete(requestId);
    }

    updateState({
      status: transportConnected ? "connected" : "disconnected",
      room: null,
      pendingCommandIds: [],
      lastAcknowledgedRevision: null,
      lastAnswerResult: null,
      settingsAccepted: null,
      reconnectAvailable: false,
      reconnectRequired: false,
      error,
    });
  };

  const requireRoom = (): ActiveRoom => {
    if (!state.room || state.status !== "connected") {
      throw new Error("Connect to a room before sending room actions.");
    }
    return state.room;
  };

  const emitRequest = (eventName: string, payload: object) => {
    const room = requireRoom();
    transport.emit(eventName, {
      requestId: createId(),
      ...payload,
    });
    return room;
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resume: async () => {
      if (!credentials) return;
      try {
        await connectTransport();
        await beginReconnect();
      } catch (error) {
        updateState({
          status: "error",
          reconnectRequired: true,
          error:
            error instanceof Error
              ? error.message
              : "Could not resume the saved room.",
        });
      }
    },
    retryReconnect: async () => {
      await connectTransport();
      await beginReconnect();
    },
    createRoom: async (playerName, config, visibility = "private") => {
      clearSavedReconnect();
      await connectTransport();
      const requestId = createId();
      updateState({ status: "connecting", error: null });
      try {
        await requestRoomJoin(requestId, "room:create", {
          requestId,
          playerName: playerName.trim(),
          visibility,
          ...(config ? { config } : {}),
        });
      } catch (error) {
        updateState({
          status: transportConnected ? "connected" : "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not create the room.",
        });
        throw error;
      }
    },
    joinRoom: async (roomId, playerName) => {
      clearSavedReconnect();
      await connectTransport();
      const requestId = createId();
      updateState({ status: "connecting", error: null });
      try {
        await requestRoomJoin(requestId, "room:join", {
          requestId,
          roomId: roomId.trim().toUpperCase(),
          playerName: playerName.trim(),
        });
      } catch (error) {
        updateState({
          status: transportConnected ? "connected" : "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not join the room.",
        });
        throw error;
      }
    },
    joinPublicRoom: async (playerName) => {
      clearSavedReconnect();
      await connectTransport();
      const requestId = createId();
      updateState({ status: "connecting", error: null });
      try {
        await requestRoomJoin(requestId, "room:matchmake", {
          requestId,
          playerName: playerName.trim(),
        });
      } catch (error) {
        updateState({
          status: transportConnected ? "connected" : "error",
          error:
            error instanceof Error
              ? error.message
              : "Public matchmaking is temporarily unavailable.",
        });
        throw error;
      }
    },
    setReady: (ready) => {
      emitRequest("room:ready", { ready });
    },
    setPaused: (paused) => {
      emitRequest("room:pause", { paused });
    },
    startRoom: () => {
      emitRequest("room:start", {});
    },
    changeSettings: (config) => {
      const room = requireRoom();
      const requestId = createId();
      updateState({ error: null, settingsAccepted: null });
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingSettings.delete(requestId);
          reject(new Error("The server did not confirm the settings change."));
        }, REQUEST_TIMEOUT_MS);
        pendingSettings.set(requestId, { resolve, reject, timeout });
        try {
          transport.emit("room:change-settings", { requestId, config });
        } catch (error) {
          clearTimeout(timeout);
          pendingSettings.delete(requestId);
          reject(
            error instanceof Error
              ? error
              : new Error("Could not send the settings change."),
          );
        }
        if (state.room?.snapshot.roomId !== room.snapshot.roomId) {
          clearTimeout(timeout);
          pendingSettings.delete(requestId);
          reject(new Error("The active room changed before settings were sent."));
        }
      });
    },
    submitCommand: async (input) => {
      const room = requireRoom();
      const missionId = room.snapshot.game.round?.missionId;
      if (!missionId) throw new Error("There is no active round.");
      const command: RoomCommand = {
        ...input,
        commandId: nextCommandId++,
        expectedRevision: room.snapshot.revision,
        missionId,
      };
      updateState({
        pendingCommandIds: [...state.pendingCommandIds, command.commandId],
        lastAnswerResult: null,
        error: null,
      });
      try {
        transport.emit("room:command", command);
        return command.commandId;
      } catch (error) {
        updateState({
          pendingCommandIds: state.pendingCommandIds.filter(
            (id) => id !== command.commandId,
          ),
          error:
            error instanceof Error
              ? error.message
              : "Could not send the room command.",
        });
        throw error;
      }
    },
    sendReaction: (emoji) => {
      if (!state.room || state.status !== "connected") return;
      try {
        transport.emit("room:reaction", { emoji });
      } catch {
        // Ignore reaction errors on disconnected sockets.
      }
    },
    leaveRoom: async () => {
      const room = requireRoom();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          leaving = null;
          reject(new Error("The server did not confirm leaving the room."));
        }, REQUEST_TIMEOUT_MS);
        leaving = { roomId: room.snapshot.roomId, resolve, timeout };
        try {
          transport.emit("room:leave", { requestId: createId() });
        } catch (error) {
          clearTimeout(timeout);
          leaving = null;
          reject(
            error instanceof Error
              ? error
              : new Error("Could not leave the room."),
          );
        }
      });
    },
    forgetReconnect: () => {
      credentials = null;
      try {
        storage.clear();
        updateState({
          room: null,
          reconnectAvailable: false,
          reconnectRequired: false,
          status: "disconnected",
          error: null,
        });
      } catch {
        updateState({ error: "Reconnect details could not be cleared." });
      }
    },
    disconnect: () => {
      for (const [requestId, pending] of pendingJoins) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Room connection was closed."));
        pendingJoins.delete(requestId);
      }
      for (const [requestId, pending] of pendingSettings) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Room connection was closed."));
        pendingSettings.delete(requestId);
      }
      if (leaving) {
        clearTimeout(leaving.timeout);
        leaving.resolve();
        leaving = null;
      }
      transport.disconnect();
      transportConnected = false;
      updateState({
        status: "disconnected",
        reconnectRequired: credentials !== null,
      });
    },
  };
};
