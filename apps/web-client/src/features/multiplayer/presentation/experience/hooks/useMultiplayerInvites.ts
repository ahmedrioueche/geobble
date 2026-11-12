import { useCallback, useEffect, useState } from "react";
import type { RoomInspectResult } from "../../../contracts/multiplayerRoomProtocol";
import type { useRoomClient } from "../../../application/useRoomClient";
import {
  clearRoomIdFromLocation,
  readRoomIdFromLocation,
} from "../../../application/roomShareLink";

interface UseMultiplayerInvitesOptions {
  client: ReturnType<typeof useRoomClient>["client"];
  room: ReturnType<typeof useRoomClient>["state"]["room"];
  playerName: string;
  onOpenEntry?: () => void;
}

export function useMultiplayerInvites({
  client,
  room,
  playerName,
  onOpenEntry,
}: UseMultiplayerInvitesOptions) {
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(() =>
    readRoomIdFromLocation(),
  );
  const [inviteInspection, setInviteInspection] = useState<{
    key: string;
    result: RoomInspectResult | null;
    error: string | null;
  } | null>(null);
  const [inviteSecret, setInviteSecret] = useState("");
  const [inviteJoinError, setInviteJoinError] = useState<string | null>(null);
  const [inviteRetryNonce, setInviteRetryNonce] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      setInviteRoomId(readRoomIdFromLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const inviteKey =
    inviteRoomId !== null ? `${inviteRoomId}:${inviteRetryNonce}` : null;
  const activeInviteInspection =
    inviteKey !== null && inviteInspection?.key === inviteKey
      ? inviteInspection
      : null;
  const inviteInspectResult = activeInviteInspection?.result ?? null;
  const inviteInspectError = activeInviteInspection?.error ?? null;
  const inviteInspecting = Boolean(
    inviteRoomId && !room && activeInviteInspection === null,
  );

  useEffect(() => {
    if (!inviteRoomId || !inviteKey || room) return;

    let cancelled = false;
    void client
      .inspectRoom(inviteRoomId)
      .then((result) => {
        if (cancelled) return;
        setInviteInspection({ key: inviteKey, result, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setInviteInspection({
          key: inviteKey,
          result: null,
          error:
            error instanceof Error
              ? error.message
              : "Could not load that room.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [inviteRoomId, inviteKey, room, client]);

  const dismissInvite = useCallback(
    (openEntryPage = false) => {
      clearRoomIdFromLocation();
      setInviteRoomId(null);
      setInviteSecret("");
      setInviteJoinError(null);
      if (openEntryPage && onOpenEntry) {
        onOpenEntry();
      }
    },
    [onOpenEntry],
  );

  const joinInvitedRoom = useCallback(() => {
    if (!inviteRoomId) return;
    setInviteJoinError(null);
    const secret = inviteInspectResult?.requiresSecret
      ? inviteSecret.trim()
      : undefined;
    void client
      .joinRoom(
        inviteRoomId,
        playerName,
        ...(secret ? [secret] : []),
      )
      .then(() => {
        clearRoomIdFromLocation();
        setInviteRoomId(null);
        setInviteSecret("");
      })
      .catch((error: unknown) => {
        setInviteJoinError(
          error instanceof Error ? error.message : "Could not join that room.",
        );
      });
  }, [client, inviteInspectResult?.requiresSecret, inviteRoomId, inviteSecret, playerName]);

  const retryInspect = useCallback(() => {
    setInviteRetryNonce((nonce) => nonce + 1);
  }, []);

  const clearInviteRoomId = useCallback(() => {
    clearRoomIdFromLocation();
    setInviteRoomId(null);
  }, []);

  return {
    inviteRoomId,
    setInviteRoomId,
    inviteInspection,
    inviteSecret,
    setInviteSecret,
    inviteJoinError,
    setInviteJoinError,
    inviteInspectResult,
    inviteInspectError,
    inviteInspecting,
    dismissInvite,
    joinInvitedRoom,
    retryInspect,
    clearInviteRoomId,
  };
}
