import type {
  RoomCredentialStorage,
  StoredRoomCredentials,
} from "./roomClientTypes";

export const CREDENTIALS_KEY = "geobble.multiplayer.reconnect";

export const getBrowserStorage = (): RoomCredentialStorage => ({
  read: (): StoredRoomCredentials | null => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    try {
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
    } catch {
      window.localStorage.removeItem(CREDENTIALS_KEY);
      return null;
    }
  },
  write: (credentials: StoredRoomCredentials): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  },
  clear: (): void => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CREDENTIALS_KEY);
    }
  },
});

