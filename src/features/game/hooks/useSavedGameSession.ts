import { useCallback, useEffect, useState } from "react";
import {
  createGameSessionSnapshot,
  GAME_SESSION_STORAGE_KEY,
  restoreGameSessionSnapshot,
  type GameSessionSnapshot,
} from "../../../store/gameSessionSnapshot";
import { useGameStore } from "../../../store/useGameStore";
import {
  GAME_STORAGE_ERROR_EVENT,
} from "../../../store/safeBrowserStorage";

export const useSavedGameSession = () => {
  const [savedSession, setSavedSession] =
    useState<GameSessionSnapshot | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const retrySave = useCallback(() => {
    try {
      const state = useGameStore.getState();
      const storage = window.localStorage;
      if (state.gameStatus === "playing") {
        const snapshot = state.createSessionSnapshot();
        storage.setItem(GAME_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
        setSavedSession(snapshot);
      } else {
        const savedValue = storage.getItem(GAME_SESSION_STORAGE_KEY);
        if (savedValue) {
          const parsed: unknown = JSON.parse(savedValue);
          const restoredState = restoreGameSessionSnapshot(
            parsed,
            state.unlockedStage,
          );
          if (restoredState.gameStatus !== "playing") {
            throw new Error("The saved game is not in progress.");
          }
          setSavedSession(createGameSessionSnapshot(restoredState));
        } else {
          storage.removeItem(GAME_SESSION_STORAGE_KEY);
          setSavedSession(null);
        }
      }
      setResumeError(null);
      return true;
    } catch (error) {
      console.error("Unable to retry saved game storage:", error);
      setResumeError(
        useGameStore.getState().gameStatus === "playing"
          ? "Your game could not be saved on this device."
          : "The saved game could not be loaded.",
      );
      return false;
    }
  }, []);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const { operation } = (
        event as CustomEvent<{ operation: "read" | "write" | "remove" }>
      ).detail;
      setResumeError(
        operation === "read"
          ? "The saved game could not be loaded."
          : "Your game could not be saved on this device.",
      );
    };
    window.addEventListener(GAME_STORAGE_ERROR_EVENT, handleStorageError);

    try {
      const storage = window.localStorage;
      const savedValue = storage.getItem(GAME_SESSION_STORAGE_KEY);
      if (savedValue) {
        const parsed: unknown = JSON.parse(savedValue);
        const restoredState = restoreGameSessionSnapshot(
          parsed,
          useGameStore.getState().unlockedStage,
        );
        if (restoredState.gameStatus !== "playing") {
          throw new Error("The saved game is not in progress.");
        }
        setSavedSession(createGameSessionSnapshot(restoredState));
      }
    } catch (error) {
      console.error("Unable to load saved game session:", error);
      setResumeError("The saved game could not be loaded.");
    }

    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.gameStatus === "playing") {
        retrySave();
        return;
      }

      try {
        window.localStorage.removeItem(GAME_SESSION_STORAGE_KEY);
        setSavedSession(null);
      } catch (error) {
        console.error("Unable to remove saved game session:", error);
        setResumeError("Your game could not be saved on this device.");
      }
    });
    return () => {
      window.removeEventListener(GAME_STORAGE_ERROR_EVENT, handleStorageError);
      unsubscribe();
    };
  }, [retrySave]);

  const resumeSession = useCallback(() => {
    if (!savedSession) return;
    useGameStore.getState().restoreSessionSnapshot(savedSession);
    setResumeError(null);
  }, [savedSession]);

  return { savedSession, resumeError, resumeSession, retrySave };
};
