import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Copy,
  Loader2,
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
import { RoomEntryPage } from "./RoomEntryPage";
import { resolveMapCountry } from "../../game/domain/gameRules";
import { WorldMap } from "../../map/WorldMap";
import type { WorldMapGameState } from "../../map/worldMapStoreSelectors";
import type {
  PowerUpKind,
  ReactionEmoji,
  RoomConfiguration,
  RoomConnectInput,
  RoomReactionEvent,
} from "../contracts/multiplayerRoomProtocol";
import type { RoomSnapshot } from "../contracts/multiplayerRoomProtocol";
import { useRoomClient } from "../application/useRoomClient";
import { RoomSettingsForm } from "./RoomSettingsForm";
import { RoomSettingsPanel } from "./RoomSettingsPanel";
import { RoundRecapCard } from "./RoundRecapCard";
import { PowerUpBar } from "./PowerUpBar";
import { StartingGameOverlay } from "./StartingGameOverlay";
import { MatchPausedOverlay } from "./MatchPausedOverlay";
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
  const [playerName, setPlayerName] = useState(
    () => readBrowserStorageItem(PLAYER_NAME_STORAGE_KEY) ?? "",
  );
  const [roomCode, setRoomCode] = useState("");
  const [roomVisibility, setRoomVisibility] = useState<"public" | "private">(
    "private",
  );
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
  const [pendingReadyTarget, setPendingReadyTarget] = useState<boolean | null>(
    null,
  );
  const [pendingPauseTarget, setPendingPauseTarget] = useState<boolean | null>(
    null,
  );
  const [isStartingGame, setIsStartingGame] = useState(false);
  const previousRoomSnapshot = useRef<RoomSnapshot | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const room = state.room;
  const snapshot = room?.snapshot;
  const round = snapshot?.game.round ?? null;
  const self = getPlayer(room, room?.playerId ?? null);
  const selfPlayerId = room?.playerId ?? null;
  const isAdmin = self?.isAdmin ?? false;
  const hasAnswered = self?.answered ?? false;
  const isSelfPaused = Boolean(self?.paused);
  const isRoomPaused = Boolean(snapshot?.game.paused);
  const waitingForCommand = state.pendingCommandIds.length > 0;
  const isUpdatingReady =
    pendingReadyTarget !== null && self?.ready !== pendingReadyTarget;
  const isUpdatingPause =
    pendingPauseTarget !== null && Boolean(self?.paused) !== pendingPauseTarget;
  const isPinLocate =
    snapshot?.config.mode === "pin" &&
    snapshot.config.pinDirection === "locate";
  const isChoiceMode =
    snapshot?.config.mode === "reverse" ||
    (snapshot?.config.mode === "pin" &&
      snapshot.config.pinDirection === "identify");

  useEffect(() => {
    if (
      pendingReadyTarget !== null &&
      (self?.ready === pendingReadyTarget ||
        snapshot?.status !== "waiting" ||
        state.status !== "connected" ||
        state.error !== null ||
        actionError !== null)
    ) {
      setPendingReadyTarget(null);
    }
  }, [
    pendingReadyTarget,
    self?.ready,
    snapshot?.status,
    state.status,
    state.error,
    actionError,
  ]);

  useEffect(() => {
    if (
      pendingPauseTarget !== null &&
      (Boolean(self?.paused) === pendingPauseTarget ||
        snapshot?.status !== "playing" ||
        state.status !== "connected" ||
        state.error !== null ||
        actionError !== null)
    ) {
      setPendingPauseTarget(null);
    }
  }, [
    pendingPauseTarget,
    self?.paused,
    snapshot?.status,
    state.status,
    state.error,
    actionError,
  ]);

  useEffect(() => {
    if (
      isStartingGame &&
      (snapshot?.status !== "waiting" ||
        state.status !== "connected" ||
        state.error !== null ||
        actionError !== null ||
        snapshot.players.length < 2 ||
        snapshot.players.some((player) => !player.connected || !player.ready))
    ) {
      setIsStartingGame(false);
    }
  }, [
    isStartingGame,
    snapshot?.status,
    snapshot?.players,
    state.status,
    state.error,
    actionError,
  ]);

  useEffect(() => {
    writeBrowserStorageItem(PLAYER_NAME_STORAGE_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    writeSoundEnabled(soundEnabled);
    writeHapticsEnabled(hapticsEnabled);
  }, [soundEnabled, hapticsEnabled]);

  useEffect(() => {
    if (state.lastAnswerResult === null) return;
    triggerMultiplayerCue(state.lastAnswerResult ? "correct" : "wrong", {
      soundEnabled,
      hapticsEnabled,
    });
  }, [state.lastAnswerResult, soundEnabled, hapticsEnabled]);

  useEffect(() => {
    const reaction = state.lastReaction;
    if (!reaction) return;
    const id = `${reaction.playerId}-${reaction.timestamp}`;
    const leftPercent = 25 + ((reaction.timestamp % 50) + 50) % 50;
    setFloatingReactions((current) => [
      ...current.slice(-11),
      { ...reaction, id, leftPercent },
    ]);
    const timeout = window.setTimeout(() => {
      setFloatingReactions((current) =>
        current.filter((item) => item.id !== id),
      );
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [state.lastReaction]);

  useEffect(() => {
    if (snapshot?.status !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [snapshot?.status, snapshot?.game.timerDeadlineAt]);

  useEffect(() => {
    if (!snapshot) {
      previousRoomSnapshot.current = null;
      return;
    }

    const previous = previousRoomSnapshot.current;
    previousRoomSnapshot.current = snapshot;
    if (!previous || previous.roomId !== snapshot.roomId) return;

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
  const [visibleSettingsNotice, setVisibleSettingsNotice] =
    useState<typeof settingsAccepted>(null);
  useEffect(() => {
    if (!settingsAccepted) {
      setVisibleSettingsNotice(null);
      return;
    }
    setVisibleSettingsNotice(settingsAccepted);
    const timeout = window.setTimeout(
      () => setVisibleSettingsNotice(null),
      4000,
    );
    return () => window.clearTimeout(timeout);
  }, [settingsAccepted]);

  const rawError = actionError ?? state.error;
  const [visibleError, setVisibleError] = useState<string | null>(rawError);
  useEffect(() => {
    setVisibleError(rawError);
    if (!rawError) return;
    const timeout = window.setTimeout(() => {
      setVisibleError(null);
      setActionError(null);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [rawError]);

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
    setPendingPauseTarget(targetPaused);
    void runAction(async () => {
      try {
        client.setPaused(targetPaused);
      } catch (error) {
        setPendingPauseTarget(null);
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
    await client.changeSettings(configuration);
    setShowSettings(false);
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
      if (input.type === "create") {
        await client.createRoom(
          input.playerName,
          input.config,
          input.visibility,
        );
      } else if (input.type === "join") {
        await client.joinRoom(input.roomId, input.playerName);
      } else {
        await client.joinPublicRoom(input.playerName);
      }
      setShowEntry(false);
      setRoomCode("");
    });

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

      {showEntry && !room && (
        <RoomEntryPage
          busy={
            state.status === "connecting" || state.status === "reconnecting"
          }
          error={visibleError}
          onClose={() => setShowEntry(false)}
          onConnectLatestRoom={() =>
            void runAction(async () => client.retryReconnect())
          }
          onCreate={() =>
            void connect({
              type: "create",
              playerName,
              visibility: roomVisibility,
            })
          }
          onJoin={() =>
            void connect({ type: "join", roomId: roomCode, playerName })
          }
          onMatchmake={() => void connect({ type: "matchmake", playerName })}
          onPlayerNameChange={setPlayerName}
          onRoomCodeChange={setRoomCode}
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
            <div>
              <p className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 md:block">
                Geobble multiplayer
              </p>
              <div className="flex items-center gap-1 md:gap-2">
                <p className="font-mono text-base font-black tracking-[0.15em] md:text-lg">
                  {snapshot.roomId}
                </p>
                <button
                  aria-label="Copy room code"
                  className="rounded-md p-1.5 text-white/55 transition hover:bg-white/10 hover:text-sky-300"
                  onClick={() => void copyRoomCode()}
                  title="Copy room code"
                  type="button"
                >
                  <Copy aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
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
              {snapshot.status !== "waiting" && (
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
              {isAdmin && snapshot.status !== "waiting" && (
                <button
                  aria-label="Change settings"
                  className="flex items-center gap-1 rounded-lg border border-white/15 p-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 disabled:opacity-50 md:px-3 md:py-2 md:text-xs"
                  disabled={state.status !== "connected"}
                  onClick={() => setShowSettings(true)}
                  title="Change settings"
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" size={14} />
                  <span className="hidden md:inline">Settings</span>
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
                className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 md:px-3 md:py-2 md:text-xs"
                disabled={state.status !== "connected"}
                onClick={() => void leave()}
                type="button"
              >
                Leave
              </button>
            </div>
          </header>

          {snapshot.status === "waiting" ? (
            <div className="absolute inset-x-4 bottom-5 top-16 z-20 mx-auto grid max-w-5xl gap-4 overflow-y-auto md:top-24 md:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
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
                      className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                      key={player.id}
                    >
                      <span className="font-bold">
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
                        className={`text-xs font-bold ${player.connected ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        {!player.connected
                          ? "Disconnected"
                          : player.ready
                            ? "Ready"
                            : "Not ready"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
                  <p className="text-sm font-bold text-white">
                    {self?.ready
                      ? "You're ready to play."
                      : "Ready to play? Let the host know."}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    {self?.ready
                      ? "Change your mind? You can mark yourself as not ready."
                      : "Select “I'm ready” when you're ready. The host can start once everyone is ready."}
                  </p>
                  <div className="sticky bottom-0 mt-4 flex flex-wrap gap-2 bg-slate-950/95 py-1">
                    <button
                      aria-busy={isUpdatingReady}
                      aria-pressed={self?.ready ?? false}
                      className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black uppercase text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        self?.ready
                          ? "bg-rose-600 hover:bg-rose-500"
                          : "bg-sky-500 text-slate-950 hover:bg-sky-400"
                      }`}
                      disabled={
                        state.status !== "connected" ||
                        isUpdatingReady ||
                        isStartingGame
                      }
                      onClick={() => {
                        const targetReady = !self?.ready;
                        setPendingReadyTarget(targetReady);
                        void runAction(async () => {
                          try {
                            client.setReady(targetReady);
                          } catch (error) {
                            setPendingReadyTarget(null);
                            throw error;
                          }
                        });
                      }}
                      type="button"
                    >
                      {isUpdatingReady && (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 animate-spin"
                        />
                      )}
                      <span>
                        {isUpdatingReady
                          ? pendingReadyTarget
                            ? "Marking ready…"
                            : "Updating…"
                          : self?.ready
                            ? "I'm not ready"
                            : "I'm ready"}
                      </span>
                    </button>
                    {isAdmin && (
                      <button
                        aria-busy={isStartingGame}
                        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={
                          state.status !== "connected" ||
                          isStartingGame ||
                          snapshot.players.length < 2 ||
                          snapshot.players.some(
                            (player) => !player.connected || !player.ready,
                          )
                        }
                        onClick={() => {
                          setIsStartingGame(true);
                          void runAction(async () => {
                            try {
                              client.startRoom();
                            } catch (error) {
                              setIsStartingGame(false);
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
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <RoomSettingsPanel
                  config={snapshot.config}
                  isAdmin={isAdmin}
                  onEdit={() => setShowSettings(true)}
                  pendingConfig={snapshot.pendingConfig}
                />
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-center backdrop-blur-xl">
                  <p className="text-sm font-bold text-white/75">
                    Waiting for the match
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Share the room code with a friend. The admin can start when
                    everyone is ready.
                  </p>
                </div>
              </div>
              {isStartingGame && (
                <StartingGameOverlay
                  modeLabel={snapshot.config.mode}
                  playerCount={snapshot.players.length}
                />
              )}
            </div>
          ) : (
            <>
              <aside
                aria-label="Player standings"
                className={`${showStandings ? "block" : "hidden"} absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-10 max-h-[40vh] w-52 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6 md:z-20 md:block md:max-h-[45vh] md:w-60 md:bg-slate-950/90`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Standings · Round {round?.number ?? 0}
                  </p>
                  <button
                    aria-label="Close players"
                    className="-mr-1 -mt-1 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white md:hidden"
                    onClick={() => setShowStandings(false)}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                </div>
                <ul className="space-y-2">
                  {[...snapshot.players]
                    .sort((first, second) => second.score - first.score)
                    .map((player) => (
                      <li
                        className="flex items-center justify-between gap-2 text-xs"
                        key={player.id}
                      >
                        <span
                          className={`flex min-w-0 items-center gap-1.5 truncate font-bold ${
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
                            className={`inline-block h-2 w-2 shrink-0 rounded-full transition ${
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
                              className="shrink-0 rounded border border-rose-400/30 bg-rose-500/20 px-1 py-0.5 text-[9px] font-black uppercase text-rose-300"
                              title="AFK / Unavailable for the moment"
                            >
                              AFK
                            </span>
                          )}
                          {player.streak >= 2 && (
                            <span
                              className="shrink-0 rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-black text-amber-300"
                              title={`${player.streak} streak`}
                            >
                              🔥{player.streak}
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-black text-sky-200">
                          {player.score}
                        </span>
                      </li>
                    ))}
                </ul>
              </aside>

              <div className="absolute right-3 top-16 z-20 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl md:right-6 md:top-24 md:p-4">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sky-300">
                  <span>
                    {snapshot.config.mode} mission
                    {round?.difficultyTier ? ` · ${round.difficultyTier}` : ""}
                  </span>
                  <span>
                    {remainingTime === null
                      ? `${round?.number ?? 0}${snapshot.config.challengeType === "count" ? ` / ${snapshot.config.challengeValue}` : ""}`
                      : formatTime(remainingTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-bold uppercase leading-snug md:text-base">
                    {isRoomPaused && !round?.revealed
                      ? "Match paused — prompt hidden"
                      : (round?.prompt.value ?? "Waiting for the next round")}
                  </p>
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
                          {choice.label}
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

          {showSettings && isAdmin && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                <h2 className="mb-4 text-lg font-black uppercase">
                  {snapshot.status === "playing"
                    ? "Next round settings"
                    : "Room settings"}
                </h2>
                {snapshot.pendingConfig && (
                  <p className="mb-3 text-xs text-amber-200">
                    A settings change is already queued. Saving replaces it.
                  </p>
                )}
                <RoomSettingsForm
                  initial={snapshot.pendingConfig ?? snapshot.config}
                  onCancel={() => setShowSettings(false)}
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
