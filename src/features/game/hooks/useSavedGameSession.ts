import { useCallback, useEffect, useState } from "react";
import {
  createGameSessionSnapshot,
  restoreGameSessionSnapshot,
  type GameSessionSnapshot,
} from "../../../store/gameSessionSnapshot";
import {
  gameSessionRepository,
  type GameSessionRepository,
} from "../../../store/gameSessionRepository";
import { useGameStore } from "../../../store/useGameStore";
import { GAME_STORAGE_ERROR_EVENT } from "../../../store/safeBrowserStorage";

export const useSavedGameSession = (
  repository: GameSessionRepository = gameSessionRepository,
) => {
  const [savedSession, setSavedSession] =
    useState<GameSessionSnapshot | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const retrySave = useCallback(async () => {
    try {
      const state = useGameStore.getState();
      if (state.session.gameStatus === "playing") {
        const snapshot = state.createSessionSnapshot();
        await repository.save(snapshot);
        setSavedSession(snapshot);
      } else {
        const savedValue = await repository.load();
        if (savedValue !== null) {
          const restoredState = restoreGameSessionSnapshot(
            savedValue,
            state.unlockedStage,
          );
          if (restoredState.session.gameStatus !== "playing") {
            throw new Error("The saved game is not in progress.");
          }
          setSavedSession(createGameSessionSnapshot(restoredState.session));
        } else {
          await repository.remove();
          setSavedSession(null);
        }
      }
      setResumeError(null);
      return true;
    } catch (error) {
      console.error("Unable to retry saved game storage:", error);
      setResumeError(
        useGameStore.getState().session.gameStatus === "playing"
          ? "Your game could not be saved on this device."
          : "The saved game could not be loaded.",
      );
      return false;
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

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

    const subscribeToGameState = () => {
      unsubscribe = useGameStore.subscribe((state) => {
        if (state.session.gameStatus === "playing") {
          void retrySave();
          return;
        }

        void repository
          .remove()
          .then(() => {
            if (active) setSavedSession(null);
          })
          .catch((error: unknown) => {
            console.error("Unable to remove saved game session:", error);
            if (active) {
              setResumeError("Your game could not be saved on this device.");
            }
          });
      });

      if (useGameStore.getState().session.gameStatus === "playing") {
        void retrySave();
      }
    };

    void repository
      .load()
      .then((savedValue) => {
        if (!active) return;
        if (savedValue !== null) {
          const restoredState = restoreGameSessionSnapshot(
            savedValue,
            useGameStore.getState().unlockedStage,
          );
          if (restoredState.session.gameStatus !== "playing") {
            throw new Error("The saved game is not in progress.");
          }
          setSavedSession(createGameSessionSnapshot(restoredState.session));
        }
        subscribeToGameState();
      })
      .catch((error: unknown) => {
        console.error("Unable to load saved game session:", error);
        if (active) {
          setResumeError("The saved game could not be loaded.");
          subscribeToGameState();
        }
      });

    return () => {
      active = false;
      window.removeEventListener(GAME_STORAGE_ERROR_EVENT, handleStorageError);
      unsubscribe?.();
    };
  }, [repository, retrySave]);

  const resumeSession = useCallback(() => {
    if (!savedSession) return;
    useGameStore.getState().restoreSessionSnapshot(savedSession);
    setResumeError(null);
  }, [savedSession]);

  return { savedSession, resumeError, resumeSession, retrySave };
};
