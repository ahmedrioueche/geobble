import { io, type Socket } from "socket.io-client";
import {
  isRoomServerEvent,
  type RoomServerEvent,
} from "../contracts/multiplayerRoomProtocol";

export type RoomTransportStatus =
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface RoomTransportListener {
  onEvent: (event: RoomServerEvent) => void;
  onStatusChange: (status: RoomTransportStatus) => void;
  onError: (error: Error) => void;
}

const serverEventNames = [
  "room:joined",
  "room:inspected",
  "room:updated",
  "room:command-accepted",
  "room:command-rejected",
  "room:settings-accepted",
  "room:vote-acknowledged",
  "room:settings-vote-resolved",
  "room:reaction",
  "room:left",
  "room:closed",
  "room:error",
] as const;

const normalizeEvent = (eventName: string, payload: unknown): unknown => {
  switch (eventName) {
    case "room:joined":
      return { type: "joined", payload };
    case "room:inspected":
      return { type: "inspected", payload };
    case "room:updated":
      return { type: "updated", snapshot: payload };
    case "room:command-accepted":
      return { type: "command-accepted", payload };
    case "room:command-rejected":
      return { type: "command-rejected", payload };
    case "room:settings-accepted":
      return { type: "settings-accepted", payload };
    case "room:vote-acknowledged":
      return { type: "vote-acknowledged", payload };
    case "room:settings-vote-resolved":
      return { type: "settings-vote-resolved", payload };
    case "room:reaction":
      return { type: "reaction", payload };
    case "room:left":
      return { type: "left", payload };
    case "room:closed":
      return { type: "closed", payload };
    case "room:error":
      return { type: "error", payload };
    default:
      return null;
  }
};

const getSocketUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_MULTIPLAYER_SERVER_URL;
  if (configuredUrl) return configuredUrl;
  if (import.meta.env.DEV) return `http://${window.location.hostname}:3000`;
  throw new Error("VITE_MULTIPLAYER_SERVER_URL is not configured.");
};

export class SocketIoRoomTransport {
  private socket: Socket | null = null;
  private listener: RoomTransportListener | null = null;
  private reconnecting = false;
  private pendingConnectAbort: (() => void) | null = null;

  async connect(listener: RoomTransportListener): Promise<void> {
    this.listener = listener;
    if (!this.socket) {
      this.socket = io(`${getSocketUrl()}/rooms`, {
        autoConnect: false,
        reconnection: true,
        timeout: 10_000,
      });
      this.bindSocketEvents(this.socket);
    }

    if (this.socket.connected) {
      listener.onStatusChange("connected");
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = this.socket;
      if (!socket) {
        reject(new Error("Room transport could not initialize."));
        return;
      }
      const handleConnect = () => {
        cleanup();
        this.reconnecting = false;
        resolve();
      };
      const handleConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        this.pendingConnectAbort = null;
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
      };
      this.pendingConnectAbort = () => {
        cleanup();
        reject(new Error("Room connection was closed."));
      };
      socket.once("connect", handleConnect);
      socket.once("connect_error", handleConnectError);
      socket.connect();
    });
  }

  emit(eventName: string, payload: unknown): void {
    if (!this.socket?.connected) {
      throw new Error("The room server is not connected.");
    }
    this.socket.emit(eventName, payload);
  }

  disconnect(): void {
    this.reconnecting = false;
    this.pendingConnectAbort?.();
    this.pendingConnectAbort = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.listener = null;
  }

  private bindSocketEvents(socket: Socket): void {
    socket.on("connect", () => {
      this.reconnecting = false;
      this.listener?.onStatusChange("connected");
    });
    socket.on("disconnect", (reason) => {
      this.reconnecting = reason !== "io client disconnect";
      this.listener?.onStatusChange(
        this.reconnecting ? "reconnecting" : "disconnected",
      );
    });
    socket.on("connect_error", (error: Error) => {
      this.listener?.onError(error);
    });
    for (const eventName of serverEventNames) {
      socket.on(eventName, (payload: unknown) => {
        const event = normalizeEvent(eventName, payload);
        if (!isRoomServerEvent(event)) {
          this.listener?.onError(
            new Error(`Received an invalid ${eventName} event from the server.`),
          );
          return;
        }
        this.listener?.onEvent(event);
      });
    }
  }
}
