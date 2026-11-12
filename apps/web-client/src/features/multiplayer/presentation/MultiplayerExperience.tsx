import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Loader2,
  LogOut,
  Pause,
  Play,
  SlidersHorizontal,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import type { CountryData } from "../../../data/country-data";
import { FlagImage } from "../../../components/atoms/FlagImage";
import { RoomEntryPage } from "./RoomEntryPage";
import { RoomLinkJoinCard } from "./RoomLinkJoinCard";
import {
  RoomHeaderShareControls,
  RoomInviteCard,
} from "./RoomShareControls";
import { resolveMapCountry } from "../../game/domain/gameRules";
import { WorldMap } from "../../map/WorldMap";
import type { WorldMapGameState } from "../../map/worldMapStoreSelectors";
import type {
  PowerUpKind,
  ReactionEmoji,
  RoomConfiguration,
  RoomConnectInput,
  RoomInspectResult,
  RoomReactionEvent,
} from "../contracts/multiplayerRoomProtocol";
import type { RoomSnapshot } from "../contracts/multiplayerRoomProtocol";
import { RoomRequestFailure } from "../application/multiplayerRoomClient";
import {
  clearRoomIdFromLocation,
  readRoomIdFromLocation,
} from "../application/roomShareLink";
import { useRoomClient } from "../application/useRoomClient";
import { RoomSettingsForm } from "./RoomSettingsForm";
import {
  RoomQuickSettingsBar,
  RoomSettingsPanel,
} from "./RoomSettingsPanel";
import { SettingsVoteBanner } from "./SettingsVoteBanner";
import { getRoomSettingsDiff } from "./roomSettingsDiff";
import { RoundRecapCard } from "./RoundRecapCard";
import { PowerUpBar } from "./PowerUpBar";
import { StartingGameOverlay } from "./StartingGameOverlay";
import { MatchPausedOverlay } from "./MatchPausedOverlay";
import { MatchFinishedOverlay } from "./MatchFinishedOverlay";
import { CheckpointOverlay } from "./CheckpointOverlay";
import {
  readHapticsEnabled,
  readSoundEnabled,
  triggerMultiplayerCue,
  writeHapticsEnabled,
  writeSoundEnabled,
} from "./multiplayerFeedback";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "../../../store/safeBrowserStorage";

const PLAYER_NAME_STORAGE_KEY = "geobble:multiplayer-player-name";

interface MultiplayerExperienceProps {
  countries: CountryData[];
  onPlayOffline: () => void;
  showHomeActions: boolean;
}

const getPlayer = (
  room: ReturnType<typeof useRoomClient>["state"]["room"],
  playerId: string | null,
) => room?.snapshot.players.find((player) => player.id === playerId);

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

export const MultiplayerExperience: React.FC<MultiplayerExperienceProps> = ({
  countries,
  onPlayOffline,
  showHomeActions,
}) => {
  const { client, state } = useRoomClient();
  const [showEntry, setShowEntry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [standingsScope, setStandingsScope] = useState<"tour" | "leg">("tour");
  const [playerName, setPlayerName] = useState(
    () => readBrowserStorageItem(PLAYER_NAME_STORAGE_KEY) ?? "",
  );
  const [roomCode, setRoomCode] = useState("");
  const [roomVisibility, setRoomVisibility] = useState<"public" | "private">(
    "public",
  );
  const [createSecret, setCreateSecret] = useState("");
  const [joinSecret, setJoinSecret] = useState("");
  const [joinRequiresSecret, setJoinRequiresSecret] = useState(false);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [localPinGuess, setLocalPinGuess] = useState<{
    missionId: string;
    location: [number, number];
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
  const [hapticsEnabled] = useState(readHapticsEnabled);
  const [floatingReactions, setFloatingReactions] = useState<
    Array<RoomReactionEvent & { id: string; leftPercent: number }>
  >([]);
  const [now, setNow] = useState(0);
  const [pendingPause, setPendingPause] = useState<{
    target: boolean;
    revision: number;
  } | null>(null);
  const [voteBannerPref, setVoteBannerPref] = useState<{
    voteId: string;
    collapsed: boolean;
  } | null>(null);
  const [startingFromRevision, setStartingFromRevision] = useState<
    number | null
  >(null);
  const previousRoomSnapshot = useRef<RoomSnapshot | null>(null);
  const lastResolvedVoteIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const reactionTimersRef = useRef<Set<number>>(new Set());
  const room = state.room;
  const snapshot = room?.snapshot;
  const round = snapshot?.game.round ?? null;
  const self = getPlayer(room, room?.playerId ?? null);
  const selfPlayerId = room?.playerId ?? null;
  const isAdmin = self?.isAdmin ?? false;
  const connectedPlayersCount =
    snapshot?.players.filter((player) => player.connected).length ?? 0;
  const eligibleVotePlayersCount =
    snapshot?.players.filter((player) => player.connected && !player.paused)
      .length ?? 0;
  const activeSettingsVote = snapshot?.settingsVote ?? null;
  const hasAnswered = self?.answered ?? false;
  const isSelfPaused = Boolean(self?.paused);
  const canProposeSettings =
    !isAdmin && eligibleVotePlayersCount >= 2 && !isSelfPaused;
  const hostCanProposeSettings =
    isAdmin && eligibleVotePlayersCount >= 2 && !isSelfPaused && !activeSettingsVote;
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
  const isRoomPaused = Boolean(snapshot?.game.paused);
  const waitingForCommand = state.pendingCommandIds.length > 0;
  const isUpdatingPause =
    pendingPause !== null &&
    snapshot?.revision === pendingPause.revision &&
    Boolean(self?.paused) !== pendingPause.target &&
    snapshot?.status === "playing" &&
    state.status === "connected" &&
    state.error === null &&
    actionError === null;
  const isStartingGame =
    startingFromRevision !== null &&
    snapshot?.revision === startingFromRevision &&
    (snapshot.status === "waiting" ||
      snapshot.status === "checkpoint" ||
      snapshot.status === "finished") &&
    state.status === "connected" &&
    state.error === null &&
    actionError === null &&
    (snapshot.status === "checkpoint" || connectedPlayersCount >= 2);
  const isPinLocate =
    snapshot?.config.mode === "pin" &&
    snapshot.config.pinDirection === "locate";
  const isChoiceMode =
    snapshot?.config.mode === "reverse" ||
    (snapshot?.config.mode === "pin" &&
      snapshot.config.pinDirection === "identify");

  useEffect(() => {
    writeBrowserStorageItem(PLAYER_NAME_STORAGE_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    writeSoundEnabled(soundEnabled);
    writeHapticsEnabled(hapticsEnabled);
  }, [soundEnabled, hapticsEnabled]);

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

  useEffect(() => {
    if (state.lastAnswerResult === null) return;
    triggerMultiplayerCue(state.lastAnswerResult ? "correct" : "wrong", {
      soundEnabled,
      hapticsEnabled,
    });
  }, [state.lastAnswerResult, soundEnabled, hapticsEnabled]);

  useEffect(() => {
    const timers = reactionTimersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const reaction = state.lastReaction;
    if (!reaction) return;
    const id = `${reaction.playerId}-${reaction.timestamp}`;
    const leftPercent = 25 + ((reaction.timestamp % 50) + 50) % 50;
    const addTimer = window.setTimeout(() => {
      reactionTimersRef.current.delete(addTimer);
      setFloatingReactions((current) => [
        ...current.slice(-11),
        { ...reaction, id, leftPercent },
      ]);
      const removeTimer = window.setTimeout(() => {
        reactionTimersRef.current.delete(removeTimer);
        setFloatingReactions((current) =>
          current.filter((item) => item.id !== id),
        );
      }, 2400);
      reactionTimersRef.current.add(removeTimer);
    }, 0);
    reactionTimersRef.current.add(addTimer);
  }, [state.lastReaction]);

  useEffect(() => {
    if (
      snapshot?.status !== "playing" &&
      snapshot?.status !== "checkpoint" &&
      !snapshot?.settingsVote
    ) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [
    snapshot?.status,
    snapshot?.settingsVote,
    snapshot?.game.timerDeadlineAt,
    snapshot?.game.checkpointResumeAt,
  ]);

  useEffect(() => {
    const resolved = state.lastVoteResolved;
    if (!resolved) {
      lastResolvedVoteIdRef.current = null;
      return;
    }
    if (lastResolvedVoteIdRef.current === resolved.voteId) return;
    lastResolvedVoteIdRef.current = resolved.voteId;

    if (resolved.outcome === "passed") {
      toast.success(
        resolved.queued
          ? "Vote passed — new settings apply next round"
          : "Vote passed — settings updated",
        { icon: "✅" },
      );
    } else if (resolved.outcome === "rejected") {
      toast("Settings proposal did not pass", { icon: "🗳️" });
    } else if (resolved.outcome === "expired") {
      toast("Settings vote timed out", { icon: "⏱️" });
    } else if (resolved.outcome === "superseded") {
      toast("Host updated room settings directly", { icon: "⚙️" });
    } else if (resolved.outcome === "cancelled") {
      toast("Settings vote cancelled", { icon: "⚠️" });
    }
  }, [state.lastVoteResolved]);

  useEffect(() => {
    if (!snapshot) {
      previousRoomSnapshot.current = null;
      return;
    }

    const previous = previousRoomSnapshot.current;
    previousRoomSnapshot.current = snapshot;
    if (!previous || previous.roomId !== snapshot.roomId) return;

    if (
      snapshot.settingsVote &&
      snapshot.settingsVote.voteId !== previous.settingsVote?.voteId &&
      snapshot.settingsVote.proposerPlayerId !== selfPlayerId
    ) {
      const vote = snapshot.settingsVote;
      const diffs = getRoomSettingsDiff(
        snapshot.pendingConfig ?? snapshot.config,
        vote.proposedConfig,
      );
      const summary =
        diffs.length > 0
          ? diffs.map((diff) => `${diff.label}: ${diff.to}`).join(" · ")
          : "room settings";
      toast(
        <span>
          <span className="font-black text-sky-300">{vote.proposerName}</span>{" "}
          wants to change {summary}
        </span>,
        { icon: "🗳️" },
      );
      triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
    }

    for (const player of snapshot.players) {
      if (player.id === selfPlayerId) continue;
      const previousPlayer = previous.players.find(
        (candidate) => candidate.id === player.id,
      );
      if (!previousPlayer && player.connected) {
        toast.success(
          <span>
            <span className="font-black text-emerald-400">{player.name}</span>{" "}
            joined the room
          </span>,
          { icon: "👋" },
        );
        triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
      } else if (
        previousPlayer &&
        !previousPlayer.connected &&
        player.connected
      ) {
        toast.success(
          <span>
            <span className="font-black text-sky-400">{player.name}</span>{" "}
            reconnected to the room
          </span>,
          { icon: "🔌" },
        );
        triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
      } else if (previousPlayer?.connected && !player.connected) {
        toast(
          <span>
            <span className="font-black text-amber-400">{player.name}</span>{" "}
            disconnected
          </span>,
          { icon: "⚠️" },
        );
        triggerMultiplayerCue("player-leave", { soundEnabled, hapticsEnabled });
      } else if (
        previousPlayer &&
        Boolean(previousPlayer.paused) !== Boolean(player.paused)
      ) {
        if (player.paused) {
          toast(
            <span>
              <span className="font-black text-rose-400">{player.name}</span>{" "}
              is AFK for the moment
            </span>,
            { icon: "⏸" },
          );
        } else {
          toast.success(
            <span>
              <span className="font-black text-emerald-400">{player.name}</span>{" "}
              is back
            </span>,
            { icon: "▶️" },
          );
        }
      }
    }

    for (const previousPlayer of previous.players) {
      if (previousPlayer.id === selfPlayerId) continue;
      const stillPresent = snapshot.players.some(
        (candidate) => candidate.id === previousPlayer.id,
      );
      if (!stillPresent) {
        toast(
          <span>
            <span className="font-black text-rose-400">
              {previousPlayer.name}
            </span>{" "}
            left the room
          </span>,
          { icon: "🚪" },
        );
        triggerMultiplayerCue("player-leave", { soundEnabled, hapticsEnabled });
      }
    }

    const previousRound = previous.game.round;
    const currentRound = snapshot.game.round;
    if (
      currentRound &&
      (!previousRound || previousRound.missionId !== currentRound.missionId)
    ) {
      lastTickSecondRef.current = null;
      triggerMultiplayerCue("round-start", { soundEnabled, hapticsEnabled });
    }
    if (
      previousRound &&
      currentRound &&
      previousRound.missionId === currentRound.missionId &&
      !previousRound.revealed &&
      currentRound.revealed &&
      currentRound.answerReveal
    ) {
      const answerName = currentRound.answerReveal.countryName;
      const scorers = snapshot.players.filter((player) => {
        const previousPlayer = previous.players.find(
          (candidate) => candidate.id === player.id,
        );
        return previousPlayer !== undefined && player.score > previousPlayer.score;
      });
      if (scorers.length > 0) {
        const names = scorers.map((player) =>
          player.id === selfPlayerId ? "You" : player.name,
        );
        const maxStreak = Math.max(...scorers.map((player) => player.streak));
        const promptValue = currentRound.prompt.value.trim().toLowerCase();
        const answerIsObvious =
          currentRound.prompt.type === "text" &&
          promptValue === answerName.trim().toLowerCase();
        toast.success(
          <span>
            <span className="font-black text-sky-500">
              {names.join(", ")}
            </span>{" "}
            got it!
            {!answerIsObvious && (
              <>
                {" "}
                The answer is{" "}
                <span className="font-black text-emerald-600">
                  {answerName}
                </span>
                .
              </>
            )}
            {maxStreak >= 2 && (
              <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                🔥 {maxStreak} in a row!
              </span>
            )}
          </span>,
          { icon: "🎯" },
        );
      }
    }
  }, [snapshot, selfPlayerId, soundEnabled, hapticsEnabled]);

  const settingsAccepted = state.settingsAccepted;
  const [dismissedSettingsNotice, setDismissedSettingsNotice] =
    useState<typeof settingsAccepted>(null);
  const visibleSettingsNotice =
    settingsAccepted && settingsAccepted !== dismissedSettingsNotice
      ? settingsAccepted
      : null;
  useEffect(() => {
    if (!settingsAccepted) return;
    const timeout = window.setTimeout(
      () => setDismissedSettingsNotice(settingsAccepted),
      4000,
    );
    return () => window.clearTimeout(timeout);
  }, [settingsAccepted]);

  const [dismissedStateError, setDismissedStateError] = useState<string | null>(
    null,
  );
  const visibleError =
    actionError ??
    (state.error && state.error !== dismissedStateError ? state.error : null);
  useEffect(() => {
    if (state.error !== null) return;
    const resetTimeout = window.setTimeout(
      () => setDismissedStateError(null),
      0,
    );
    return () => window.clearTimeout(resetTimeout);
  }, [state.error]);
  useEffect(() => {
    if (!visibleError) return;
    const timeout = window.setTimeout(() => {
      setActionError(null);
      if (state.error) setDismissedStateError(state.error);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [visibleError, state.error]);

  const gameState = useMemo<WorldMapGameState>(
    () => ({
      gameStatus:
        snapshot?.status === "playing"
          ? "playing"
          : snapshot?.status === "finished"
            ? "finished"
            : "idle",
      mode: snapshot?.config.mode ?? "identify",
      pinDirection: snapshot?.config.pinDirection ?? "locate",
      pinLocation:
        self?.pinLocation ??
        (self?.answered &&
        localPinGuess &&
        localPinGuess.missionId === round?.missionId
          ? localPinGuess.location
          : null),
      revealed: round?.revealed ?? false,
    }),
    [
      snapshot,
      self?.pinLocation,
      self?.answered,
      round?.missionId,
      round?.revealed,
      localPinGuess,
    ],
  );

  const gameUi = useMemo(
    () => ({
      feedback:
        state.lastAnswerResult === null
          ? null
          : state.lastAnswerResult
            ? ("correct" as const)
            : ("wrong" as const),
      clickedCode: null,
      clickedName: null,
    }),
    [state.lastAnswerResult],
  );

  const targetMapAnchor =
    snapshot?.config.mode === "reverse" ||
    (snapshot?.config.mode === "pin" &&
      snapshot.config.pinDirection === "identify")
      ? round?.prompt.mapAnchor
      : undefined;
  const remainingTime =
    snapshot?.game.timerDeadlineAt === null ||
    snapshot?.game.timerDeadlineAt === undefined
      ? null
      : Math.max(
          0,
          snapshot.game.timerDeadlineAt -
            (now === 0 ? snapshot.game.timerDeadlineAt : now),
        );

  const roundRemainingMs =
    round?.deadlineAt != null
      ? Math.max(0, round.deadlineAt - (now === 0 ? (round.startedAt ?? round.deadlineAt) : now))
      : 0;

  const pauseRemainingMs =
    snapshot?.game.pauseDeadlineAt != null
      ? Math.max(
          0,
          snapshot.game.pauseDeadlineAt -
            (now === 0 ? snapshot.game.pauseDeadlineAt : now),
        )
      : null;

  const checkpointRemainingMs =
    snapshot?.game.checkpointResumeAt != null
      ? Math.max(
          0,
          snapshot.game.checkpointResumeAt -
            (now === 0 ? snapshot.game.checkpointResumeAt - 10_000 : now),
        )
      : 0;

  const spectatorPromptRemainingMs =
    self?.paused && self.spectatorPromptDeadlineAt != null
      ? Math.max(
          0,
          self.spectatorPromptDeadlineAt -
            (now === 0
              ? self.spectatorPromptDeadlineAt - 30_000
              : now),
        )
      : null;

  const togglePause = (targetPaused = !isSelfPaused) => {
    if (snapshot?.status !== "playing") return;
    setPendingPause({ target: targetPaused, revision: snapshot.revision });
    void runAction(async () => {
      try {
        client.setPaused(targetPaused);
      } catch (error) {
        setPendingPause(null);
        throw error;
      }
    });
  };

  const confirmSpectating = () => {
    if (snapshot?.status !== "playing") return;
    void runAction(async () => {
      client.setPaused(true);
    });
  };

  useEffect(() => {
    if (!round || round.revealed || round.deadlineAt == null) return;
    const remainingSec = Math.ceil(roundRemainingMs / 1000);
    if (
      remainingSec >= 1 &&
      remainingSec <= 5 &&
      lastTickSecondRef.current !== remainingSec
    ) {
      lastTickSecondRef.current = remainingSec;
      triggerMultiplayerCue("tick", { soundEnabled, hapticsEnabled });
    }
  }, [round, roundRemainingMs, soundEnabled, hapticsEnabled]);

  const usePowerUp = (kind: PowerUpKind) => {
    if (!round || round.revealed || hasAnswered || isSelfPaused || isRoomPaused) {
      return;
    }
    triggerMultiplayerCue("powerup", { soundEnabled, hapticsEnabled });
    void runAction(async () => {
      await client.submitCommand({ type: "powerup", kind });
    });
  };

  const sendReaction = (emoji: ReactionEmoji) => {
    client.sendReaction(emoji);
  };

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The room action failed.",
      );
    }
  };

  const saveRoomSettings = async (configuration: RoomConfiguration) => {
    setActionError(null);
    if (isAdmin) {
      await client.changeSettings(configuration);
    } else {
      await client.proposeSettings(configuration);
    }
    setShowSettings(false);
  };

  const proposeRoomSettings = async (configuration: RoomConfiguration) => {
    setActionError(null);
    await client.proposeSettings(configuration);
    setShowSettings(false);
  };

  const renderVoteBanner = () => {
    if (!activeSettingsVote || !selfPlayerId) return null;
    const hasVoted =
      activeSettingsVote.yesPlayerIds.includes(selfPlayerId) ||
      activeSettingsVote.noPlayerIds.includes(selfPlayerId);
    const isCollapsed =
      voteBannerPref?.voteId === activeSettingsVote.voteId
        ? voteBannerPref.collapsed
        : hasVoted;

    return (
      <SettingsVoteBanner
        collapsed={isCollapsed}
        connected={state.status === "connected"}
        currentConfig={snapshot?.pendingConfig ?? snapshot!.config}
        isSelfPaused={isSelfPaused}
        nowMs={now === 0 ? activeSettingsVote.createdAt : now}
        onToggleCollapse={() =>
          setVoteBannerPref({
            voteId: activeSettingsVote.voteId,
            collapsed: !isCollapsed,
          })
        }
        onVote={castSettingsVote}
        otherEligiblePlayerName={otherEligiblePlayerName}
        selfPlayerId={selfPlayerId}
        variant="floating"
        vote={activeSettingsVote}
      />
    );
  };

  const castSettingsVote = async (voteId: string, approve: boolean) => {
    setActionError(null);
    await client.voteSettings(voteId, approve);
  };

  const copyRoomCode = async () => {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(snapshot.roomId);
      toast.success("Room code copied");
    } catch {
      toast.error("Could not copy the room code. Please copy it manually.");
    }
  };

  const connect = (input: RoomConnectInput) =>
    runAction(async () => {
      try {
        if (input.type === "create") {
          await client.createRoom(
            input.playerName,
            input.config,
            input.visibility,
            ...(input.secret ? [input.secret] : []),
          );
        } else if (input.type === "join") {
          await client.joinRoom(
            input.roomId,
            input.playerName,
            ...(input.secret ? [input.secret] : []),
          );
        } else {
          await client.joinPublicRoom(input.playerName);
        }
        setShowEntry(false);
        setRoomCode("");
        setCreateSecret("");
        setJoinSecret("");
        setJoinRequiresSecret(false);
      } catch (error) {
        if (
          input.type === "join" &&
          error instanceof RoomRequestFailure &&
          (error.code === "SECRET_REQUIRED" || error.code === "INVALID_SECRET")
        ) {
          setJoinRequiresSecret(true);
        }
        throw error;
      }
    });

  const dismissInvite = useCallback(
    (openEntryPage = false) => {
      clearRoomIdFromLocation();
      setInviteRoomId(null);
      setInviteSecret("");
      setInviteJoinError(null);
      if (openEntryPage) setShowEntry(true);
    },
    [],
  );

  const joinInvitedRoom = () => {
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
        setInviteRoomId(null);
        setInviteSecret("");
        setInviteJoinError(null);
      })
      .catch((error: unknown) => {
        setInviteJoinError(
          error instanceof Error
            ? error.message
            : "Could not join the room.",
        );
      });
  };

  const submitMapAnswer = (
    name: string,
    code: string,
    coordinates?: [number, number],
  ) => {
    if (
      !snapshot ||
      snapshot.status !== "playing" ||
      !round ||
      hasAnswered ||
      isSelfPaused ||
      isRoomPaused
    ) {
      return;
    }
    if (snapshot.config.mode !== "identify" && !isPinLocate) return;
    const selectedCountry = resolveMapCountry(name, code, countries);
    if (isPinLocate) {
      if (!coordinates) {
        setActionError("Could not read the selected map location. Try again.");
        return;
      }
      setLocalPinGuess({ missionId: round.missionId, location: coordinates });
    }
    void runAction(async () => {
      await client.submitCommand({
        type: "answer",
        answerCountryCode: selectedCountry?.cca3 ?? null,
        ...(isPinLocate && coordinates ? { pinLocation: coordinates } : {}),
      });
    });
  };

  const submitChoice = (choiceId: string) => {
    if (!isChoiceMode || !round || hasAnswered || isSelfPaused || isRoomPaused) {
      return;
    }
    void runAction(async () => {
      await client.submitCommand({
        type: "answer",
        answerCountryCode: null,
        choiceId,
      });
    });
  };

  const leave = () =>
    runAction(async () => {
      await client.leaveRoom();
      clearRoomIdFromLocation();
      setInviteRoomId(null);
      setShowSettings(false);
      setLocalPinGuess(null);
    });

  return (
    <>
      <Toaster
        containerStyle={{
          bottom: visibleError ? 72 : 16,
        }}
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
          },
        }}
      />
      {!room && (
        <>
          {showHomeActions && !showEntry && (
            <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 gap-3 md:bottom-8 md:left-8 md:w-auto md:max-w-none md:translate-x-0">
              <button
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 px-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(56,189,248,0.3)] transition hover:from-sky-300 hover:to-blue-500 active:scale-[0.98] md:min-w-56 md:flex-none md:px-6 md:text-base"
                onClick={onPlayOffline}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Single player
              </button>
              <button
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_32px_rgba(168,85,247,0.28)] transition hover:from-violet-400 hover:to-fuchsia-500 active:scale-[0.98] md:min-w-56 md:flex-none md:px-6 md:text-base"
                onClick={() => setShowEntry(true)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Multiplayer
              </button>
            </div>
          )}
          {visibleError && !showEntry && (
            <p
              className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-lg border border-rose-300/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-rose-200 md:bottom-4"
              role="alert"
            >
              {visibleError}
            </p>
          )}
        </>
      )}

      {inviteRoomId && !room && (
        <RoomLinkJoinCard
          busy={
            state.status === "connecting" || state.status === "reconnecting"
          }
          inspectError={inviteInspectError}
          inspected={inviteInspectResult}
          inspecting={inviteInspecting}
          joinError={inviteJoinError}
          onClose={() => dismissInvite(false)}
          onConnectLatestRoom={() =>
            void runAction(async () => {
              await client.retryReconnect();
              clearRoomIdFromLocation();
              setInviteRoomId(null);
            })
          }
          onJoin={joinInvitedRoom}
          onOpenEntryPage={() => dismissInvite(true)}
          onPlayerNameChange={setPlayerName}
          onRetryInspect={() => setInviteRetryNonce((value) => value + 1)}
          onRoomSecretChange={setInviteSecret}
          playerName={playerName}
          reconnectAvailable={state.reconnectAvailable}
          roomId={inviteRoomId}
          roomSecret={inviteSecret}
        />
      )}

      {showEntry && !room && (
        <RoomEntryPage
          busy={
            state.status === "connecting" || state.status === "reconnecting"
          }
          createSecret={createSecret}
          error={visibleError}
          joinRequiresSecret={joinRequiresSecret}
          joinSecret={joinSecret}
          onClose={() => setShowEntry(false)}
          onConnectLatestRoom={() =>
            void runAction(async () => client.retryReconnect())
          }
          onCreate={() =>
            void connect({
              type: "create",
              playerName,
              visibility: roomVisibility,
              ...(roomVisibility === "private" && createSecret.trim()
                ? { secret: createSecret }
                : {}),
            })
          }
          onCreateSecretChange={setCreateSecret}
          onJoin={() =>
            void connect({
              type: "join",
              roomId: roomCode,
              playerName,
              ...(joinSecret.trim() ? { secret: joinSecret } : {}),
            })
          }
          onJoinSecretChange={setJoinSecret}
          onMatchmake={() => void connect({ type: "matchmake", playerName })}
          onPlayerNameChange={setPlayerName}
          onRoomCodeChange={(value) => {
            setRoomCode(value);
            setJoinRequiresSecret(false);
            setJoinSecret("");
          }}
          onVisibilityChange={setRoomVisibility}
          playerName={playerName}
          reconnectAvailable={state.reconnectAvailable}
          roomCode={roomCode}
          status={state.status}
          visibility={roomVisibility}
        />
      )}

      {room && snapshot && (
        <section
          aria-label="Multiplayer room"
          className="fixed inset-0 z-[115] overflow-hidden bg-slate-950 text-white"
        >
          <div className="absolute inset-0">
            <WorldMap
              countries={countries}
              gameOverride={gameState}
              gameUiOverride={gameUi}
              selectedCountryCode={round?.answerReveal?.countryCode ?? null}
              selectedCountryName={round?.answerReveal?.countryName ?? null}
              missionId={round?.missionId}
              onCountryClick={submitMapAnswer}
              targetMapAnchor={targetMapAnchor}
            />
          </div>

          <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-xl md:min-h-16 md:flex-wrap md:gap-3 md:px-7 md:py-3">
            <RoomHeaderShareControls
              onCopyCode={() => void copyRoomCode()}
              roomId={snapshot.roomId}
              roomSecret={room.roomSecret}
              visibility={snapshot.visibility}
            />
            <div className="flex items-center gap-2 md:gap-3">
              {state.status !== "connected" && (
                <span className="text-[10px] font-bold uppercase text-amber-300 md:text-xs">
                  {state.status}
                </span>
              )}
              {state.reconnectRequired && state.status === "error" && (
                <button
                  className="text-[10px] font-black uppercase text-sky-300 underline"
                  onClick={() =>
                    void runAction(async () => client.retryReconnect())
                  }
                  type="button"
                >
                  Retry
                </button>
              )}
              {snapshot.status === "playing" && (
                <button
                  aria-expanded={showStandings}
                  aria-label="Toggle players"
                  className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 md:hidden"
                  onClick={() => setShowStandings((value) => !value)}
                  type="button"
                >
                  <Users aria-hidden="true" size={14} />
                  {snapshot.players.filter((player) => player.answered).length}/
                  {snapshot.players.length}
                </button>
              )}
              {snapshot.status === "playing" && (
                <button
                  aria-busy={isUpdatingPause}
                  aria-label={isSelfPaused ? "Resume game" : "Pause game"}
                  aria-pressed={isSelfPaused}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-50 md:px-3 md:py-2 md:text-xs ${
                    isSelfPaused
                      ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
                      : "border-white/15 text-white/80 hover:bg-white/10"
                  }`}
                  disabled={state.status !== "connected" || isUpdatingPause}
                  onClick={() => togglePause(!isSelfPaused)}
                  type="button"
                >
                  {isUpdatingPause ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  ) : isSelfPaused ? (
                    <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isUpdatingPause
                      ? isSelfPaused
                        ? "Resuming…"
                        : "Pausing…"
                      : isSelfPaused
                        ? "Resume"
                        : "Pause"}
                  </span>
                </button>
              )}
              {(isAdmin || canProposeSettings) && snapshot.status !== "waiting" && (
                <button
                  aria-label={
                    isAdmin
                      ? "Change settings"
                      : activeSettingsVote
                        ? "Settings vote active"
                        : "Propose settings change"
                  }
                  className="flex items-center gap-1 rounded-lg border border-white/15 p-1.5 text-[10px] font-black uppercase text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 md:px-3 md:py-2 md:text-xs"
                  disabled={
                    state.status !== "connected" ||
                    (!isAdmin && Boolean(activeSettingsVote))
                  }
                  onClick={() => setShowSettings(true)}
                  title={
                    isAdmin
                      ? "Change settings"
                      : activeSettingsVote
                        ? "Settings vote already active"
                        : "Propose settings change"
                  }
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" size={14} />
                  <span className="hidden md:inline">
                    {isAdmin
                      ? "Settings"
                      : activeSettingsVote
                        ? "Vote"
                        : "Propose"}
                  </span>
                </button>
              )}
              <button
                aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                aria-pressed={soundEnabled}
                className="rounded-lg border border-white/15 p-1.5 text-white/75 hover:bg-white/10 hover:text-white md:p-2"
                onClick={() => setSoundEnabled((value) => !value)}
                title={soundEnabled ? "Sound on" : "Sound muted"}
                type="button"
              >
                {soundEnabled ? (
                  <Volume2 aria-hidden="true" size={14} />
                ) : (
                  <VolumeX aria-hidden="true" size={14} />
                )}
              </button>
              <button
                aria-label="Leave"
                className="flex items-center gap-1 rounded-lg border border-white/15 p-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 disabled:opacity-50 md:px-3 md:py-2 md:text-xs"
                disabled={state.status !== "connected"}
                onClick={() => void leave()}
                title="Leave room"
                type="button"
              >
                <LogOut aria-hidden="true" size={14} />
                <span className="hidden md:inline">Leave</span>
              </button>
            </div>
          </header>

          {snapshot.status !== "playing" && activeSettingsVote && selfPlayerId && (
            <div className="pointer-events-none absolute inset-x-3 top-14 z-30 mx-auto max-w-5xl md:inset-x-4 md:top-20">
              {renderVoteBanner()}
            </div>
          )}

          {snapshot.status === "waiting" ? (
            <div
              aria-label="Waiting room"
              className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto overflow-x-hidden bg-slate-950/95 backdrop-blur-xl md:inset-x-4 md:bottom-5 md:top-24 md:bg-transparent md:backdrop-blur-none"
            >
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-0 md:gap-4 md:p-0">
                <div className="md:hidden">
                  <RoomQuickSettingsBar
                    canPropose={canProposeSettings}
                    config={snapshot.config}
                    hasActiveVote={Boolean(activeSettingsVote)}
                    isAdmin={isAdmin}
                    onOpenSettings={() => setShowSettings(true)}
                    pendingConfig={snapshot.pendingConfig}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-3 md:grid md:min-h-0 md:grid-cols-[1fr_1.2fr] md:gap-4">
                  <div className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-xl md:bg-slate-950/90 md:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-black uppercase tracking-wider">
                        Players
                      </h2>
                      <span className="text-xs text-white/50">
                        {snapshot.players.length} players
                      </span>
                    </div>
                    <ul
                      aria-label="Room players"
                      className="max-h-[40vh] space-y-2 overflow-y-auto overscroll-contain pr-1"
                    >
                      {snapshot.players.map((player) => (
                        <li
                          className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-3 sm:px-4"
                          key={player.id}
                        >
                          <span className="min-w-0 truncate font-bold">
                            {player.name}
                            {player.isAdmin && (
                              <span className="ml-2 text-[10px] font-black uppercase text-sky-300">
                                Admin
                              </span>
                            )}
                            {player.id === room.playerId && (
                              <span className="ml-2 text-[10px] uppercase text-white/40">
                                You
                              </span>
                            )}
                          </span>
                          <span
                            className={`shrink-0 text-xs font-bold ${player.connected ? "text-emerald-300" : "text-rose-300"}`}
                          >
                            {player.connected ? "Connected" : "Disconnected"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {isAdmin ? (
                      <div className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
                        <p className="text-sm font-bold text-white">
                          {connectedPlayersCount >= 2
                            ? "Match can start whenever you want."
                            : "Waiting for another player to join."}
                        </p>
                        <div className="sticky bottom-0 mt-4 bg-slate-950/95 py-1">
                          <button
                            aria-busy={isStartingGame}
                            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={
                              state.status !== "connected" ||
                              isStartingGame ||
                              connectedPlayersCount < 2
                            }
                            onClick={() => {
                              setStartingFromRevision(snapshot.revision);
                              void runAction(async () => {
                                try {
                                  client.startRoom();
                                } catch (error) {
                                  setStartingFromRevision(null);
                                  throw error;
                                }
                              });
                            }}
                            type="button"
                          >
                            {isStartingGame && (
                              <Loader2
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 animate-spin"
                              />
                            )}
                            <span>
                              {isStartingGame ? "Starting game…" : "Start game"}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-bold text-white">
                          Waiting for the host to start
                        </p>
                        <div
                          aria-label="Waiting for the host to start"
                          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                        >
                          <div className="waiting-line-loader h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400/40 via-sky-300 to-sky-400/40" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-3 md:gap-4">
                    <RoomSettingsPanel
                      canPropose={canProposeSettings}
                      config={snapshot.config}
                      hasActiveVote={Boolean(activeSettingsVote)}
                      isAdmin={isAdmin}
                      onEdit={() => setShowSettings(true)}
                      onPropose={() => setShowSettings(true)}
                      pendingConfig={snapshot.pendingConfig}
                    />
                    <RoomInviteCard
                      onCopyCode={() => void copyRoomCode()}
                      roomId={snapshot.roomId}
                      roomSecret={room.roomSecret}
                      visibility={snapshot.visibility}
                    />
                  </div>
                </div>
              </div>
              {isStartingGame && (
                <StartingGameOverlay
                  modeLabel={snapshot.config.mode}
                  playerCount={snapshot.players.length}
                />
              )}
            </div>
          ) : snapshot.status === "checkpoint" ? (
            <CheckpointOverlay
              canProposeSettings={canProposeSettings}
              connected={state.status === "connected"}
              hasActiveVote={Boolean(activeSettingsVote)}
              isAdmin={isAdmin}
              isAdvancingLeg={isStartingGame}
              onLeave={() => void leave()}
              onOpenSettings={() => setShowSettings(true)}
              onSendReaction={sendReaction}
              onStartNextLegNow={() => {
                setStartingFromRevision(snapshot.revision);
                void runAction(async () => {
                  try {
                    client.startRoom();
                  } catch (error) {
                    setStartingFromRevision(null);
                    throw error;
                  }
                });
              }}
              onToggleCountdownPause={() =>
                void runAction(async () => {
                  client.setPaused(!snapshot.game.checkpointPaused);
                })
              }
              remainingMs={checkpointRemainingMs}
              selfPlayerId={selfPlayerId}
              snapshot={snapshot}
            />
          ) : snapshot.status === "finished" ? (
            <>
              <MatchFinishedOverlay
                canProposeSettings={canProposeSettings}
                connected={state.status === "connected"}
                connectedPlayersCount={connectedPlayersCount}
                hasActiveVote={Boolean(activeSettingsVote)}
                isAdmin={isAdmin}
                isStartingRematch={isStartingGame}
                onLeave={() => void leave()}
                onOpenSettings={() => setShowSettings(true)}
                onPlayAgain={() => {
                  setStartingFromRevision(snapshot.revision);
                  void runAction(async () => {
                    try {
                      client.startRoom();
                    } catch (error) {
                      setStartingFromRevision(null);
                      throw error;
                    }
                  });
                }}
                onSendReaction={sendReaction}
                selfPlayerId={selfPlayerId}
                snapshot={snapshot}
              />
              {isStartingGame && (
                <StartingGameOverlay
                  modeLabel={snapshot.config.mode}
                  playerCount={snapshot.players.length}
                />
              )}
            </>
          ) : (
            <>
              <aside
                aria-label="Player standings"
                className={`${showStandings ? "block" : "hidden"} absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-10 max-h-[45vh] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6 md:z-20 md:block md:max-h-[50vh] md:w-80 md:bg-slate-950/90`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-widest text-sky-300">
                    Standings · Round {round?.number ?? 0}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {snapshot.game.legNumber !== undefined && (
                      <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-[11px] font-black uppercase">
                        <button
                          className={`rounded-md px-2 py-1 transition ${
                            standingsScope === "tour"
                              ? "bg-sky-400 text-slate-950"
                              : "text-white/60 hover:text-white"
                          }`}
                          onClick={() => setStandingsScope("tour")}
                          type="button"
                        >
                          Tour
                        </button>
                        <button
                          className={`rounded-md px-2 py-1 transition ${
                            standingsScope === "leg"
                              ? "bg-sky-400 text-slate-950"
                              : "text-white/60 hover:text-white"
                          }`}
                          onClick={() => setStandingsScope("leg")}
                          type="button"
                        >
                          Leg
                        </button>
                      </div>
                    )}
                    <button
                      aria-label="Close players"
                      className="-mr-1 -mt-1 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white md:hidden"
                      onClick={() => setShowStandings(false)}
                      type="button"
                    >
                      <X aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[...snapshot.players]
                    .sort((first, second) =>
                      standingsScope === "leg"
                        ? (second.checkpointsWon ?? 0) -
                            (first.checkpointsWon ?? 0) ||
                          second.score - first.score
                        : second.score - first.score,
                    )
                    .map((player) => {
                      const legWins = player.checkpointsWon ?? 0;
                      return (
                        <li
                          className="flex items-center justify-between gap-3 text-sm"
                          key={player.id}
                        >
                          <span
                            className={`flex min-w-0 items-center gap-2 truncate font-bold ${
                              player.paused ? "text-rose-400" : ""
                            }`}
                          >
                            <span
                              aria-label={
                                player.paused
                                  ? `${player.name} AFK`
                                  : player.lockedOut
                                    ? `${player.name} locked out`
                                    : player.answered
                                      ? `${player.name} answered`
                                      : `${player.name} thinking`
                              }
                              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full transition ${
                                player.paused
                                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]"
                                  : player.lockedOut
                                    ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
                                    : player.answered
                                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                                      : "bg-white/20"
                              }`}
                              title={
                                player.paused
                                  ? "AFK / Unavailable for the moment"
                                  : player.lockedOut
                                    ? "Locked out this round"
                                    : player.answered
                                      ? "Locked in"
                                      : "Thinking…"
                              }
                            />
                            <span className="truncate">
                              {player.name}
                              {player.id === room.playerId ? " (you)" : ""}
                            </span>
                            {player.paused && (
                              <span
                                className="shrink-0 rounded border border-rose-400/30 bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-black uppercase text-rose-300"
                                title="AFK / Unavailable for the moment"
                              >
                                AFK
                              </span>
                            )}
                            {legWins > 0 && (
                              <span
                                className="shrink-0 rounded bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-black text-amber-200"
                                title={`${legWins} leg wins`}
                              >
                                👑{legWins}
                              </span>
                            )}
                            {player.streak >= 2 && (
                              <span
                                className="shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-black text-amber-300"
                                title={`${player.streak} streak`}
                              >
                                🔥{player.streak}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-sm font-black text-sky-200">
                            {standingsScope === "leg"
                              ? `${legWins} ${legWins === 1 ? "win" : "wins"}`
                              : player.score}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </aside>

              <div className="pointer-events-none absolute inset-x-3 top-16 z-20 flex flex-col items-end gap-2 md:inset-x-6 md:top-24 md:flex-row md:items-start md:justify-between">
                {activeSettingsVote && selfPlayerId && (
                  <div className="w-[min(22rem,calc(100vw-1.5rem))] md:w-80">
                    {renderVoteBanner()}
                  </div>
                )}
                <div className="pointer-events-auto ml-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl md:p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-sky-300">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span>
                      {snapshot.game.legNumber !== undefined
                        ? `Leg ${snapshot.game.legNumber} · `
                        : ""}
                      {snapshot.config.mode}
                      {round?.difficultyTier ? ` · ${round.difficultyTier}` : ""}
                    </span>
                    {(snapshot.game.legMultiplier ?? 1) > 1 && (
                      <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                        {snapshot.game.legMultiplier}x
                      </span>
                    )}
                  </span>
                  <span>
                    {remainingTime === null
                      ? `${snapshot.game.legRoundNumber ?? round?.number ?? 0}${snapshot.config.challengeType === "count" ? ` / ${snapshot.config.challengeValue}` : ""}`
                      : formatTime(remainingTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {isRoomPaused && !round?.revealed ? (
                    <p className="min-w-0 text-sm font-bold uppercase leading-snug md:text-base">
                      Match paused — prompt hidden
                    </p>
                  ) : round?.prompt.type === "flag" ? (
                    <div className="flex min-w-0 items-center gap-3">
                      <FlagImage
                        alt="Target flag"
                        className="h-12 md:h-14 w-auto rounded-lg border border-white/15 shadow-md"
                        code={round.prompt.flagCode}
                        fallback={
                          <span className="text-3xl leading-none" role="img">
                            {round.prompt.value}
                          </span>
                        }
                        size="md"
                      />
                    </div>
                  ) : (
                    <p className="min-w-0 text-sm font-bold uppercase leading-snug md:text-base">
                      {round?.prompt.value ?? "Waiting for the next round"}
                    </p>
                  )}
                  {isAdmin && !round?.revealed && (
                    <button
                      className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase text-white/85 transition hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40"
                      disabled={waitingForCommand}
                      onClick={() =>
                        void runAction(async () => {
                          await client.submitCommand({ type: "reveal" });
                        })
                      }
                      type="button"
                    >
                      Reveal
                    </button>
                  )}
                </div>
                {isSelfPaused &&
                  !isRoomPaused &&
                  snapshot.status === "playing" &&
                  (spectatorPromptRemainingMs !== null ? (
                    <div
                      aria-label="Spectator inactivity check"
                      className="mt-2.5 rounded-xl border border-amber-300/35 bg-amber-400/10 p-2.5"
                      role="alert"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase text-amber-200">
                        <span>Still spectating?</span>
                        <span className="font-mono text-amber-300">
                          {Math.ceil(spectatorPromptRemainingMs / 1000)}s
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          className="flex-1 rounded-lg border border-amber-300/40 bg-amber-300/20 px-2.5 py-1.5 text-[10px] font-black uppercase text-amber-100 transition hover:bg-amber-300/30"
                          onClick={confirmSpectating}
                          type="button"
                        >
                          Still watching
                        </button>
                        <button
                          aria-busy={isUpdatingPause}
                          className="flex-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                          disabled={isUpdatingPause}
                          onClick={() => togglePause(false)}
                          type="button"
                        >
                          {isUpdatingPause ? "Resuming…" : "Resume playing"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      aria-busy={isUpdatingPause}
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                      disabled={isUpdatingPause}
                      onClick={() => togglePause(false)}
                      type="button"
                    >
                      {isUpdatingPause ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                      ) : (
                        <Play
                          aria-hidden="true"
                          className="h-3.5 w-3.5 fill-current"
                        />
                      )}
                      <span>
                        {isUpdatingPause ? "Resuming…" : "Resume playing"}
                      </span>
                    </button>
                  ))}
                {round &&
                  !round.revealed &&
                  round.startedAt != null &&
                  round.deadlineAt != null && (
                    <div
                      aria-label={`${Math.ceil(roundRemainingMs / 1000)} seconds left`}
                      className="mt-2.5"
                      role="timer"
                    >
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${roundRemainingMs <= 5000 ? "bg-rose-400" : "bg-sky-400"}`}
                          style={{
                            width: `${Math.min(100, (roundRemainingMs / Math.max(1, round.deadlineAt - round.startedAt)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`mt-1 text-right font-mono text-[10px] font-black ${roundRemainingMs <= 5000 ? "text-rose-300" : "text-white/50"}`}
                      >
                        {Math.ceil(roundRemainingMs / 1000)}s
                      </p>
                    </div>
                  )}
                {round?.revealed &&
                  round.answerReveal &&
                  (isChoiceMode || snapshot.config.subMode !== "name") &&
                  round.prompt.value.trim().toLowerCase() !==
                    round.answerReveal.countryName.trim().toLowerCase() && (
                    <p className="mt-2 text-xs font-black uppercase text-emerald-300">
                      Answer: {round.answerReveal.countryName}
                    </p>
                  )}
                {self?.hint && !round?.revealed && (
                  <p
                    className="mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200"
                    role="note"
                  >
                    💡 {self.hint}
                  </p>
                )}
                {(state.lastAnswerResult === false || self?.lockedOut) &&
                  !round?.revealed && (
                    <p
                      className="mt-2 text-xs font-black uppercase text-rose-300"
                      role="status"
                    >
                      Locked out — waiting for other players
                    </p>
                  )}
                {visibleSettingsNotice && (
                  <p className="mt-2 text-[10px] font-bold text-amber-200">
                    Settings{" "}
                    {visibleSettingsNotice.queued
                      ? "queued for the next round"
                      : "updated"}
                    .
                  </p>
                )}
                {isChoiceMode && round && !round.revealed && !isRoomPaused && (
                  <div className="mt-3 grid gap-2">
                    {round.choices
                      .filter(
                        (choice) => !self?.hiddenChoiceIds?.includes(choice.id),
                      )
                      .map((choice) => (
                        <button
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left text-xs font-black uppercase hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40"
                          disabled={
                            hasAnswered ||
                            waitingForCommand ||
                            isSelfPaused ||
                            isRoomPaused
                          }
                          key={choice.id}
                          onClick={() => submitChoice(choice.id)}
                          type="button"
                        >
                          {snapshot.config.subMode === "flag" && choice.flagCode ? (
                            <FlagImage
                              alt="Flag choice"
                              className="mx-auto h-9 md:h-10 w-auto rounded-md border border-white/15 shadow-sm"
                              code={choice.flagCode}
                              fallback={<span className="text-2xl leading-none">{choice.label}</span>}
                              size="sm"
                            />
                          ) : (
                            choice.label
                          )}
                        </button>
                      ))}
                  </div>
                )}
                {round && !round.revealed && self?.powerUps && !isRoomPaused && (
                  <PowerUpBar
                    disabled={
                      hasAnswered ||
                      waitingForCommand ||
                      isSelfPaused ||
                      isRoomPaused
                    }
                    doubleActive={Boolean(self.doubleActive)}
                    hasRoundTimer={round.deadlineAt != null}
                    isChoiceMode={Boolean(isChoiceMode)}
                    onUsePowerUp={usePowerUp}
                    powerUps={self.powerUps}
                  />
                )}
                {round?.revealed && round.result && (
                    <RoundRecapCard
                      answerName={round.answerReveal?.countryName}
                      onSendReaction={sendReaction}
                      players={snapshot.players}
                      result={round.result}
                      selfPlayerId={selfPlayerId}
                    />
                  )}
                </div>
              </div>
              {snapshot.status === "playing" && isRoomPaused && (
                <MatchPausedOverlay
                  onResume={() => togglePause(false)}
                  pausedPlayerNames={snapshot.players
                    .filter((player) => player.connected && player.paused)
                    .map((player) => player.name)}
                  remainingMs={pauseRemainingMs}
                  selfPaused={isSelfPaused}
                  updatingPause={isUpdatingPause}
                />
              )}
            </>
          )}

          {floatingReactions.length > 0 && (
            <div
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 bottom-16 z-40 overflow-hidden"
            >
              {floatingReactions.map((item) => (
                <div
                  className=" inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 px-3 py-1 text-xs font-bold text-white shadow-lg animate-bounce"
                  key={item.id}
                  style={{
                    marginLeft: `${item.leftPercent}%`,
                  }}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-[10px] font-black uppercase text-sky-300">
                    {item.playerId === selfPlayerId ? "You" : item.playerName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {visibleError && (
            <p
              className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-rose-300/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-rose-200"
              role="alert"
            >
              {visibleError}
            </p>
          )}

          {showSettings && canOpenSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md md:items-center md:p-4">
              <div
                aria-labelledby="room-settings-modal-title"
                aria-modal="true"
                className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md md:rounded-2xl md:border md:border-white/10 md:shadow-2xl"
                role="dialog"
              >
                <div className="shrink-0 border-b border-white/10 px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-5">
                  <h2
                    className="text-lg font-black uppercase"
                    id="room-settings-modal-title"
                  >
                    {!isAdmin
                      ? "Propose settings vote"
                      : snapshot.status === "playing"
                        ? "Next round settings"
                        : "Room settings"}
                  </h2>
                  {!isAdmin && (
                    <p className="mt-1 text-xs text-white/60">
                      {snapshot.status === "playing"
                        ? "Applies on the next round if the room votes yes."
                        : "Applies immediately if the room votes yes."}
                    </p>
                  )}
                  {snapshot.pendingConfig && (
                    <p className="mt-2 text-xs text-amber-200">
                      {isAdmin
                        ? "A settings change is already queued. Saving replaces it."
                        : "A settings change is already queued. Passing a vote replaces it."}
                    </p>
                  )}
                </div>
                <RoomSettingsForm
                  canPropose={hostCanProposeSettings}
                  initial={snapshot.pendingConfig ?? snapshot.config}
                  mode={isAdmin ? "edit" : "propose"}
                  onCancel={() => setShowSettings(false)}
                  onPropose={proposeRoomSettings}
                  onSave={saveRoomSettings}
                  submitting={false}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};
