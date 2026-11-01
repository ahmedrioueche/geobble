import {
  isRoomServerMessage,
  type RoomCommand,
  type RoomCommandInput,
  type RoomRequest,
  type RoomServerMessage,
  type RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import { createGameSessionId } from "../../game/domain/gameSession";

export type RoomConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface ActiveRoom {
  playerId: string;
  snapshot: RoomSnapshot;
}

export interface RoomClientState {
  status: RoomConnectionStatus;
  room: ActiveRoom | null;
  pendingCommandIds: number[];
  lastAcknowledgedRevision: number | null;
  error: string | null;
}

export type RoomTransportStatus =
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface RoomTransportListener {
  onMessage: (message: unknown) => void;
  onStatusChange: (status: RoomTransportStatus) => void;
  onError: (error: unknown) => void;
}

export interface RoomTransport {
  connect: (request: RoomRequest, listener: RoomTransportListener) => Promise<void>;
  sendCommand: (roomId: string, command: RoomCommand) => Promise<void>;
  disconnect: () => Promise<void>;
}

type RemoveRequestId<Request> = Request extends RoomRequest
  ? Omit<Request, "requestId">
  : never;

export type RoomConnectInput = RemoveRequestId<RoomRequest>;

export interface RoomClient {
  getState: () => RoomClientState;
  subscribe: (listener: (state: RoomClientState) => void) => () => void;
  connect: (request: RoomConnectInput) => Promise<void>;
  submitCommand: (command: RoomCommandInput) => Promise<number>;
  disconnect: () => Promise<void>;
}

const initialState = (): RoomClientState => ({
  status: "disconnected",
  room: null,
  pendingCommandIds: [],
  lastAcknowledgedRevision: null,
  error: null,
});

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Room connection failed.";

export const createRoomClient = (
  transport: RoomTransport,
  createId: () => string = createGameSessionId,
): RoomClient => {
  let state = initialState();
  let connectionGeneration = 0;
  let nextCommandId = 0;
  let activeRequest: RoomRequest | null = null;
  const listeners = new Set<(state: RoomClientState) => void>();

  const updateState = (changes: Partial<RoomClientState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener(state);
  };

  const removePendingCommand = (commandId: number) => {
    if (!state.pendingCommandIds.includes(commandId)) return;
    updateState({
      pendingCommandIds: state.pendingCommandIds.filter(
        (pendingId) => pendingId !== commandId,
      ),
    });
  };

  const handleMessage = (messageValue: unknown, generation: number) => {
    if (generation !== connectionGeneration) return;
    if (!isRoomServerMessage(messageValue)) {
      updateState({ error: "Received an invalid room message." });
      return;
    }

    const message: RoomServerMessage = messageValue;
    if (message.type === "room-joined") {
      if (
        !activeRequest ||
        message.requestId !== activeRequest.requestId ||
        (activeRequest.type === "join-room" &&
          message.snapshot.roomId !== activeRequest.roomId)
      ) {
        return;
      }
      updateState({
        status: "connected",
        room: { playerId: message.playerId, snapshot: message.snapshot },
        pendingCommandIds: [],
        lastAcknowledgedRevision: null,
        error: null,
      });
      return;
    }

    if (message.type === "room-updated") {
      if (
        !state.room ||
        message.snapshot.roomId !== state.room.snapshot.roomId ||
        message.snapshot.revision <= state.room.snapshot.revision
      ) {
        return;
      }
      updateState({
        room: { ...state.room, snapshot: message.snapshot },
        error: null,
      });
      return;
    }

    if (message.type === "command-accepted") {
      if (
        !state.room ||
        message.roomId !== state.room.snapshot.roomId ||
        !state.pendingCommandIds.includes(message.commandId)
      ) {
        return;
      }
      removePendingCommand(message.commandId);
      updateState({
        lastAcknowledgedRevision: Math.max(
          state.lastAcknowledgedRevision ?? 0,
          message.revision,
        ),
        error: null,
      });
      return;
    }

    if (message.type === "command-rejected") {
      if (
        !state.room ||
        message.roomId !== state.room.snapshot.roomId ||
        !state.pendingCommandIds.includes(message.commandId)
      ) {
        return;
      }
      removePendingCommand(message.commandId);
      updateState({ error: `Command rejected: ${message.reason}.` });
      return;
    }

    if (message.type === "room-error") {
      if (
        message.requestId !== null &&
        activeRequest?.requestId !== message.requestId
      ) {
        return;
      }
      updateState({
        ...(state.room ? {} : { status: "error" }),
        error: message.message,
      });
      return;
    }

    if (
      message.type === "room-left" &&
      state.room?.snapshot.roomId === message.roomId
    ) {
      updateState({
        room: null,
        pendingCommandIds: [],
        lastAcknowledgedRevision: null,
      });
    }
  };

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    connect: async (requestInput) => {
      const requestId = createId();
      const request: RoomRequest =
        requestInput.type === "create-room"
          ? {
              type: "create-room",
              playerName: requestInput.playerName,
              requestId,
            }
          : {
              type: "join-room",
              roomId: requestInput.roomId,
              playerName: requestInput.playerName,
              requestId,
            };
      const generation = ++connectionGeneration;
      activeRequest = request;
      nextCommandId = 0;
      updateState({
        ...initialState(),
        status: "connecting",
      });

      try {
        await transport.connect(request, {
          onMessage: (message) => handleMessage(message, generation),
          onStatusChange: (status) => {
            if (generation !== connectionGeneration) return;
            if (status === "disconnected") {
              updateState({ status: "disconnected" });
              return;
            }
            updateState({
              status,
              ...(status === "connected" ? { error: null } : {}),
            });
          },
          onError: (error) => {
            if (generation !== connectionGeneration) return;
            updateState({ error: getErrorMessage(error) });
          },
        });
      } catch (error) {
        if (generation === connectionGeneration) {
          updateState({
            status: "error",
            error: getErrorMessage(error),
          });
        }
        throw error;
      }
    },

    submitCommand: async (commandInput) => {
      if (state.status !== "connected" || !state.room) {
        throw new Error("Cannot submit a command without an active room.");
      }
      const missionId = state.room.snapshot.game.missionId;
      if (!missionId) {
        throw new Error("Cannot submit a command without an active mission.");
      }

      const command: RoomCommand = {
        ...commandInput,
        commandId: ++nextCommandId,
        expectedRevision: state.room.snapshot.revision,
        missionId,
      };
      const roomId = state.room.snapshot.roomId;
      updateState({
        pendingCommandIds: [...state.pendingCommandIds, command.commandId],
        error: null,
      });
      try {
        await transport.sendCommand(roomId, command);
        return command.commandId;
      } catch (error) {
        removePendingCommand(command.commandId);
        updateState({ error: getErrorMessage(error) });
        throw error;
      }
    },

    disconnect: async () => {
      connectionGeneration += 1;
      activeRequest = null;
      updateState(initialState());
      try {
        await transport.disconnect();
      } catch (error) {
        updateState({
          status: "error",
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
  };
};
