import { useCallback, useState } from "react";
import type {
  RoomConfiguration,
  RoomSnapshot,
} from "../../../contracts/multiplayerRoomProtocol";
import type { useRoomClient } from "../../../application/useRoomClient";

interface UseMultiplayerVotingOptions {
  client: ReturnType<typeof useRoomClient>["client"];
  snapshot: RoomSnapshot | null | undefined;
  selfPlayerId: string | null;
  isAdmin: boolean;
  isSelfPaused: boolean;
  eligibleVotePlayersCount: number;
  onClearActionError?: () => void;
  onCloseSettings?: () => void;
}

export function useMultiplayerVoting({
  client,
  snapshot,
  selfPlayerId,
  isAdmin,
  isSelfPaused,
  eligibleVotePlayersCount,
  onClearActionError,
  onCloseSettings,
}: UseMultiplayerVotingOptions) {
  const [voteBannerPref, setVoteBannerPref] = useState<{
    voteId: string;
    collapsed: boolean;
  } | null>(null);

  const activeSettingsVote = snapshot?.settingsVote ?? null;

  const canProposeSettings =
    !isAdmin && eligibleVotePlayersCount >= 2 && !isSelfPaused;
  const hostCanProposeSettings =
    isAdmin &&
    eligibleVotePlayersCount >= 2 &&
    !isSelfPaused &&
    !activeSettingsVote;
  const canOpenSettingsModal = isAdmin || canProposeSettings;

  const otherEligiblePlayerName =
    activeSettingsVote && activeSettingsVote.eligibleCount === 2
      ? (snapshot?.players.find(
          (player) =>
            player.connected &&
            !player.paused &&
            player.id !== activeSettingsVote.proposerPlayerId,
        )?.name ?? null)
      : null;

  const hasVoted = Boolean(
    activeSettingsVote &&
      selfPlayerId &&
      (activeSettingsVote.yesPlayerIds.includes(selfPlayerId) ||
        activeSettingsVote.noPlayerIds.includes(selfPlayerId)),
  );

  const isCollapsed =
    activeSettingsVote && voteBannerPref?.voteId === activeSettingsVote.voteId
      ? voteBannerPref.collapsed
      : hasVoted;

  const toggleCollapseVoteBanner = useCallback(() => {
    if (!activeSettingsVote) return;
    setVoteBannerPref({
      voteId: activeSettingsVote.voteId,
      collapsed: !isCollapsed,
    });
  }, [activeSettingsVote, isCollapsed]);

  const castSettingsVote = useCallback(
    async (voteId: string, approve: boolean) => {
      onClearActionError?.();
      await client.voteSettings(voteId, approve);
    },
    [client, onClearActionError],
  );

  const saveRoomSettings = useCallback(
    async (configuration: RoomConfiguration) => {
      onClearActionError?.();
      if (isAdmin) {
        await client.changeSettings(configuration);
      } else {
        await client.proposeSettings(configuration);
      }
      onCloseSettings?.();
    },
    [client, isAdmin, onClearActionError, onCloseSettings],
  );

  const proposeRoomSettings = useCallback(
    async (configuration: RoomConfiguration) => {
      onClearActionError?.();
      await client.proposeSettings(configuration);
      onCloseSettings?.();
    },
    [client, onClearActionError, onCloseSettings],
  );

  return {
    activeSettingsVote,
    canProposeSettings,
    hostCanProposeSettings,
    canOpenSettingsModal,
    otherEligiblePlayerName,
    hasVoted,
    isCollapsed,
    toggleCollapseVoteBanner,
    castSettingsVote,
    saveRoomSettings,
    proposeRoomSettings,
  };
}
