// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../../../store/gameStateDefaults";
import {
  createGameSessionSnapshot,
  GAME_SESSION_STORAGE_KEY,
} from "../../../../store/gameSessionSnapshot";
import { useGameStore } from "../../../../store/useGameStore";
import { useSavedGameSession } from "./useSavedGameSession";

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
  window.localStorage.clear();
});

describe("useSavedGameSession", () => {
  it("saves active sessions and removes completed sessions", async () => {
    const { result } = renderHook(() => useSavedGameSession());

    act(() => useGameStore.getState().setGameStatus("playing"));

    await waitFor(() =>
      expect(
        window.localStorage.getItem(GAME_SESSION_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const savedValue = window.localStorage.getItem(GAME_SESSION_STORAGE_KEY);
    expect(savedValue).not.toBeNull();
    expect(JSON.parse(savedValue!).gameStatus).toBe("playing");
    expect(result.current.savedSession?.gameStatus).toBe("playing");

    act(() => useGameStore.getState().setGameStatus("finished"));
    await waitFor(() =>
      expect(
        window.localStorage.getItem(GAME_SESSION_STORAGE_KEY),
      ).toBeNull(),
    );
    expect(
      window.localStorage.getItem(GAME_SESSION_STORAGE_KEY),
    ).toBeNull();
    await waitFor(() => expect(result.current.savedSession).toBeNull());
  });

  it("loads and restores an active session", async () => {
    const snapshot = createGameSessionSnapshot({
      ...createInitialGameState().session,
      score: 40,
      gameStatus: "playing",
      currentCountryCode: "CAN",
      pendingAdvanceAt: Date.now() + 1200,
    });
    window.localStorage.setItem(
      GAME_SESSION_STORAGE_KEY,
      JSON.stringify(snapshot),
    );

    const { result } = renderHook(() => useSavedGameSession());
    await waitFor(() =>
      expect(result.current.savedSession?.currentCountryCode).toBe("CAN"),
    );
    expect(result.current.savedSession?.currentCountryCode).toBe("CAN");

    act(() => result.current.resumeSession());

    expect(useGameStore.getState().session.score).toBe(40);
    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(useGameStore.getState().session.currentCountryCode).toBe("CAN");
    expect(useGameStore.getState().session.pendingAdvanceAt).toBe(
      snapshot.pendingAdvanceAt,
    );
  });

  it("surfaces invalid saved data instead of treating it as resumable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem(GAME_SESSION_STORAGE_KEY, "{invalid json");

    const { result } = renderHook(() => useSavedGameSession());

    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "The saved game could not be loaded.",
      ),
    );
    expect(result.current.savedSession).toBeNull();
    expect(result.current.resumeError).toBe("The saved game could not be loaded.");
    expect(error).toHaveBeenCalledOnce();
  });

  it("keeps gameplay active and reports a quota failure when saving", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });
    const { result } = renderHook(() => useSavedGameSession());

    act(() => useGameStore.getState().setGameStatus("playing"));

    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "Your game could not be saved on this device.",
      ),
    );
    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(result.current.savedSession).toBeNull();
    expect(result.current.resumeError).toBe(
      "Your game could not be saved on this device.",
    );
    expect(error).toHaveBeenCalledWith(
      "Unable to retry saved game storage:",
      expect.objectContaining({ cause: expect.any(DOMException) }),
    );
  });

  it("reports unavailable browser storage without preventing game state changes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage access denied", "SecurityError");
    });

    const { result } = renderHook(() => useSavedGameSession());
    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "The saved game could not be loaded.",
      ),
    );
    expect(result.current.resumeError).toBe("The saved game could not be loaded.");

    act(() => useGameStore.getState().setGameStatus("playing"));

    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "Your game could not be saved on this device.",
      ),
    );
    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(result.current.savedSession).toBeNull();
    expect(result.current.resumeError).toBe(
      "Your game could not be saved on this device.",
    );
    expect(error).toHaveBeenCalledWith(
      "Unable to load saved game session:",
      expect.objectContaining({ cause: expect.any(DOMException) }),
    );
  });

  it("retries saving the latest active state after storage recovers", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let storageAvailable = false;
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (!storageAvailable) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      originalSetItem.call(this, key, value);
    });

    const { result } = renderHook(() => useSavedGameSession());
    act(() => useGameStore.getState().setGameStatus("playing"));
    act(() => useGameStore.getState().setScore(75));

    expect(result.current.savedSession).toBeNull();
    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "Your game could not be saved on this device.",
      ),
    );

    storageAvailable = true;
    await act(async () => {
      expect(await result.current.retrySave()).toBe(true);
    });

    expect(result.current.resumeError).toBeNull();
    expect(result.current.savedSession?.score).toBe(75);
    expect(
      JSON.parse(
        window.localStorage.getItem(GAME_SESSION_STORAGE_KEY) ?? "null",
      ).score,
    ).toBe(75);
    expect(error).toHaveBeenCalled();
  });

  it("retries after access to the localStorage getter is restored", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const storage = window.localStorage;
    let storageAvailable = false;
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      if (!storageAvailable) {
        throw new DOMException("Storage access denied", "SecurityError");
      }
      return storage;
    });

    const { result } = renderHook(() => useSavedGameSession());
    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "The saved game could not be loaded.",
      ),
    );
    expect(result.current.resumeError).toBe("The saved game could not be loaded.");

    act(() => useGameStore.getState().setGameStatus("playing"));

    await waitFor(() =>
      expect(result.current.resumeError).toBe(
        "Your game could not be saved on this device.",
      ),
    );
    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(result.current.savedSession).toBeNull();
    expect(result.current.resumeError).toBe(
      "Your game could not be saved on this device.",
    );

    storageAvailable = true;
    await act(async () => {
      expect(await result.current.retrySave()).toBe(true);
    });

    expect(result.current.resumeError).toBeNull();
    expect(result.current.savedSession?.gameStatus).toBe("playing");
    expect(
      JSON.parse(
        storage.getItem(GAME_SESSION_STORAGE_KEY) ?? "null",
      ).gameStatus,
    ).toBe("playing");
    expect(error).toHaveBeenCalledWith(
      "Unable to load saved game session:",
      expect.objectContaining({ cause: expect.any(DOMException) }),
    );
  });
});
