import type {
  RoomCommand,
  RoomErrorCode,
  RoomInspectResult,
  RoomJoinedEvent,
  RoomServerEvent,
} from "../contracts/multiplayerRoomProtocol";
import {
  SocketIoRoomTransport,
  type RoomTransportListener,
  type RoomTransportStatus,
} from "../infrastructure/socketIoRoomTransport";
import { createGameSessionId } from "../../game/domain/gameSession";
import {
  type ActiveRoom,
  REQUEST_TIMEOUT_MS,
  type RoomClient,
  type RoomClientState,
  type RoomCredentialStorage,
  RoomRequestFailure,
  type RoomTransport,
  type StoredRoomCredentials,
  TERMINAL_RECONNECT_ERROR_CODES,
} from "./roomClient/roomClientTypes";
import { getBrowserStorage } from "./roomClient/roomCredentialStorage";
import { PendingRequestRegistry } from "./roomClient/pendingRequestRegistry";

export * from "./roomClient/roomClientTypes";
export * from "./roomClient/roomCredentialStorage";
export * from "./roomClient/pendingRequestRegistry";

const makeRequestId = (): string => createGameSessionId();

export const createRoomClient = (
  transport: RoomTransport = new SocketIoRoomTransport(),
  storage: RoomCredentialStorage = getBrowserStorage(),
  createId: () => string = makeRequestId,
): RoomClient => {
  const listeners = new Set<(state: RoomClientState) => void>();
  const pendingJoins = new PendingRequestRegistry<RoomJoinedEvent>();
  const pendingInspects = new PendingRequestRegistry<RoomInspectResult>();
  const pendingSettings = new PendingRequestRegistry<void>();

  let credentials: StoredRoomCredentials | null = null;
  let nextCommandId = 1;
  let transportConnected = false;
  let transportReconnecting = false;
  let connecting: Promise<void> | null = null;
  let connectionGeneration = 0;
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
    lastVoteResolved: null,
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
    const error = new RoomRequestFailure(message, code);
    if (requestId) {
      pendingJoins.reject(requestId, error);
      return;
    }
    pendingJoins.rejectAll(error);
  };

  const acceptJoinedRoom = (event: RoomJoinedEvent) => {
    const pending = pendingJoins.get(event.requestId);
    if (!pending) return;
    pendingJoins.delete(event.requestId);

    credentials = {
      roomId: event.snapshot.roomId,
      playerId: event.playerId,
      reconnectToken: event.reconnectToken,
    };
    nextCommandId = event.nextCommandId;
    const activeRoom: ActiveRoom = {
      playerId: event.playerId,
      snapshot: event.snapshot,
      ...(event.roomSecret ? { roomSecret: event.roomSecret } : {}),
    };
    try {
      storage.write(credentials);
      updateState({
        status: "connected",
        room: activeRoom,
        pendingCommandIds: [],
        lastAcknowledgedRevision: null,
        lastAnswerResult: null,
        lastVoteResolved: null,
        reconnectAvailable: true,
        reconnectRequired: false,
        error: null,
      });
      pending.resolve(event);
    } catch {
      updateState({
        status: "connected",
        room: activeRoom,
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
      case "inspected":
        pendingInspects.resolve(event.payload.requestId, event.payload);
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
        pendingSettings.resolve(event.payload.requestId);
        updateState({
          settingsAccepted: {
            queued: event.payload.queued,
            revision: event.payload.revision,
          },
        });
        return;
      case "vote-acknowledged":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        pendingSettings.resolve(event.payload.requestId);
        return;
      case "settings-vote-resolved":
        if (state.room?.snapshot.roomId !== event.payload.roomId) return;
        updateState({ lastVoteResolved: event.payload });
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
          if (pendingInspects.has(event.payload.requestId)) {
            pendingInspects.reject(
              event.payload.requestId,
              new RoomRequestFailure(
                event.payload.message,
                event.payload.code,
              ),
            );
            return;
          }
          if (pendingSettings.has(event.payload.requestId)) {
            pendingSettings.reject(
              event.payload.requestId,
              new Error(event.payload.message),
            );
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
      case "left": {
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
        const kickedForInactivity = event.payload.reason === "inactivity";
        updateState({
          status: kickedForInactivity ? "error" : "disconnected",
          room: null,
          pendingCommandIds: [],
          reconnectAvailable: false,
          reconnectRequired: false,
          error: kickedForInactivity
            ? "You were removed from the room due to inactivity."
            : null,
        });
        return;
      }
      case "closed": {
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
        const closedForInactivity = event.payload.reason === "inactivity";
        updateState({
          status: "error",
          room: null,
          pendingCommandIds: [],
          reconnectAvailable: false,
          reconnectRequired: false,
          error: closedForInactivity
            ? "This room was closed due to inactivity."
            : "This room has closed.",
        });
        return;
      }
    }
  };

  const listener: RoomTransportListener = {
    onEvent: handleEvent,
    onStatusChange: (status: RoomTransportStatus) => {
      if (status === "connected") {
        const shouldAutoReconnect = transportReconnecting || state.room !== null;
        transportConnected = true;
        transportReconnecting = false;
        if (credentials && shouldAutoReconnect) {
          void beginReconnect();
        } else if (!state.room) {
          updateState({ status: "connected", error: null });
        }
        return;
      }
      transportConnected = false;
      transportReconnecting = status === "reconnecting";
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
      const generation = connectionGeneration;
      updateState({ status: "connecting", error: null });
      const connectPromise = transport
        .connect(listener)
        .then(() => {
          if (connectionGeneration === generation) {
            transportConnected = true;
          }
        })
        .catch((error: unknown) => {
          if (connectionGeneration === generation) {
            updateState({
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not connect to the room server.",
            });
          }
          throw error;
        })
        .finally(() => {
          if (connecting === connectPromise) {
            connecting = null;
          }
        });
      connecting = connectPromise;
    }
    await connecting;
  };

  const requestRoomJoin = (
    requestId: string,
    eventName: string,
    payload: unknown,
  ): Promise<RoomJoinedEvent> => {
    const promise = pendingJoins.create(
      requestId,
      REQUEST_TIMEOUT_MS,
      () => new Error("The room server did not respond in time."),
    );
    try {
      transport.emit(eventName, payload);
    } catch (error) {
      pendingJoins.delete(requestId);
      throw error instanceof Error
        ? error
        : new Error("Could not send the room request.");
    }
    return promise;
  };

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

    pendingSettings.rejectAll(new Error("The saved room session is no longer valid."));

    updateState({
      status: transportConnected ? "connected" : "disconnected",
      room: null,
      pendingCommandIds: [],
      lastAcknowledgedRevision: null,
      lastAnswerResult: null,
      settingsAccepted: null,
      lastVoteResolved: null,
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
    if (state.error !== null) {
      updateState({ error: null });
    }
    transport.emit(eventName, {
      requestId: createId(),
      ...payload,
    });
    return room;
  };

  const sendSettingsRequest = (
    eventName: string,
    payload: Record<string, unknown>,
    timeoutMessage: string,
    sendErrorMessage: string,
    extraState: Partial<RoomClientState> = {},
  ) => {
    const room = requireRoom();
    const requestId = createId();
    updateState({ error: null, ...extraState });
    const promise = pendingSettings.create(
      requestId,
      REQUEST_TIMEOUT_MS,
      () => new Error(timeoutMessage),
    );
    try {
      transport.emit(eventName, { requestId, ...payload });
    } catch (error) {
      pendingSettings.delete(requestId);
      throw error instanceof Error ? error : new Error(sendErrorMessage);
    }
    if (state.room?.snapshot.roomId !== room.snapshot.roomId) {
      pendingSettings.delete(requestId);
      throw new Error("The active room changed before the request was sent.");
    }
    return promise;
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
    inspectRoom: async (roomId) => {
      await connectTransport();
      const requestId = createId();
      const promise = pendingInspects.create(
        requestId,
        REQUEST_TIMEOUT_MS,
        () => new Error("The room server did not respond in time."),
      );
      try {
        transport.emit("room:inspect", {
          requestId,
          roomId: roomId.trim().toUpperCase(),
        });
      } catch (error) {
        pendingInspects.delete(requestId);
        throw error instanceof Error
          ? error
          : new Error("Could not inspect the room.");
      }
      return promise;
    },
    createRoom: async (
      playerName,
      config,
      visibility = "private",
      secret,
    ) => {
      clearSavedReconnect();
      await connectTransport();
      const requestId = createId();
      updateState({ status: "connecting", error: null });
      const trimmedSecret =
        visibility === "private" ? secret?.trim() : undefined;
      try {
        await requestRoomJoin(requestId, "room:create", {
          requestId,
          playerName: playerName.trim(),
          visibility,
          ...(trimmedSecret ? { secret: trimmedSecret } : {}),
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
    joinRoom: async (roomId, playerName, secret) => {
      clearSavedReconnect();
      await connectTransport();
      const requestId = createId();
      updateState({ status: "connecting", error: null });
      const trimmedSecret = secret?.trim();
      try {
        await requestRoomJoin(requestId, "room:join", {
          requestId,
          roomId: roomId.trim().toUpperCase(),
          playerName: playerName.trim(),
          ...(trimmedSecret ? { secret: trimmedSecret } : {}),
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
    setPaused: (paused) => {
      emitRequest("room:pause", { paused });
    },
    startRoom: () => {
      emitRequest("room:start", {});
    },
    changeSettings: (config) =>
      sendSettingsRequest(
        "room:change-settings",
        { config },
        "The server did not confirm the settings change.",
        "Could not send the settings change.",
        { settingsAccepted: null },
      ),
    proposeSettings: (config) =>
      sendSettingsRequest(
        "room:propose-settings",
        { config },
        "The server did not confirm the settings vote proposal.",
        "Could not send the settings proposal.",
      ),
    voteSettings: (voteId, approve) =>
      sendSettingsRequest(
        "room:vote-settings",
        { voteId, approve },
        "The server did not confirm your vote.",
        "Could not send your vote.",
      ),
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
      connectionGeneration += 1;
      connecting = null;
      reconnecting = false;
      reconnectRequestId = null;
      transportReconnecting = false;
      pendingJoins.rejectAll(new Error("Room connection was closed."));
      pendingInspects.rejectAll(new Error("Room connection was closed."));
      pendingSettings.rejectAll(new Error("Room connection was closed."));
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
