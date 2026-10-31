import type { StateStorage } from "zustand/middleware";

export const GAME_STORAGE_ERROR_EVENT = "geobble:storage-error";

interface GameStorageErrorDetail {
  operation: "read" | "write" | "remove";
  error: unknown;
}

const reportStorageError = (
  operation: GameStorageErrorDetail["operation"],
  error: unknown,
) => {
  console.error(`Unable to ${operation} game storage:`, error);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GameStorageErrorDetail>(GAME_STORAGE_ERROR_EVENT, {
        detail: { operation, error },
      }),
    );
  }
};

export const createSafeBrowserStorage = (): StateStorage => ({
  getItem: (name) => {
    try {
      return typeof window === "undefined"
        ? null
        : window.localStorage.getItem(name);
    } catch (error) {
      reportStorageError("read", error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(name, value);
      }
    } catch (error) {
      reportStorageError("write", error);
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(name);
      }
    } catch (error) {
      reportStorageError("remove", error);
    }
  },
});
