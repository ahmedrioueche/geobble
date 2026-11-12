import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import toast, { Toaster } from "react-hot-toast";
import type { CountryData } from "../../../data/country-data";
import { RoomEntryPage } from "./RoomEntryPage";
import { RoomLinkJoinCard } from "./RoomLinkJoinCard";
import { WorldMap } from "../../map/WorldMap";
import type { WorldMapGameState } from "../../map/worldMapStoreSelectors";
import type { RoomConnectInput } from "../contracts/multiplayerRoomProtocol";
import { RoomRequestFailure } from "../application/multiplayerRoomClient";
import { useRoomClient } from "../application/useRoomClient";
import { SettingsVoteBanner } from "./SettingsVoteBanner";
import { StartingGameOverlay } from "./StartingGameOverlay";
import { MatchFinishedOverlay } from "./MatchFinishedOverlay";
import { CheckpointOverlay } from "./CheckpointOverlay";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "../../../store/safeBrowserStorage";
import {
  buildMultiplayerGameUi,
  buildMultiplayerMapState,
  resolveMultiplayerMapAnchor,
} from "./experience/adapters/multiplayerMapAdapter";
import {
  useMultiplayerClock,
  useMultiplayerFeedback,
  useMultiplayerGameplay,
  useMultiplayerInvites,
  useMultiplayerStandings,
  useMultiplayerVoting,
} from "./experience/hooks";
import {
  MultiplayerActiveRound,
  MultiplayerHeader,
  MultiplayerLandingActions,
  MultiplayerSettingsModal,
  MultiplayerStandingsDrawer,
  MultiplayerWaitingLobby,
} from "./experience/components";

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

export const MultiplayerExperience: React.FC<MultiplayerExperienceProps> = ({
  countries,
  onPlayOffline,
  showHomeActions,
}) => {
  const { client, state } = useRoomClient();
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

  const [showEntry, setShowEntry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [startingFromRevision, setStartingFromRevision] = useState<
    number | null
  >(null);

  useEffect(() => {
    writeBrowserStorageItem(PLAYER_NAME_STORAGE_KEY, playerName);
  }, [playerName]);

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The room action failed.",
      );
    }
  }, []);

  const {
    inviteRoomId,
    inviteSecret,
    setInviteSecret,
    inviteJoinError,
    inviteInspectResult,
    inviteInspectError,
    inviteInspecting,
    dismissInvite,
    joinInvitedRoom,
    retryInspect,
    clearInviteRoomId,
  } = useMultiplayerInvites({
    client,
    room,
    playerName,
    onOpenEntry: () => setShowEntry(true),
  });

  const {
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    floatingReactions,
    lastTickSecondRef,
  } = useMultiplayerFeedback({
    snapshot,
    selfPlayerId,
    lastAnswerResult: state.lastAnswerResult,
    lastReaction: state.lastReaction,
    lastVoteResolved: state.lastVoteResolved,
  });

  const {
    now,
    remainingTime,
    roundRemainingMs,
    pauseRemainingMs,
    checkpointRemainingMs,
    spectatorPromptRemainingMs,
  } = useMultiplayerClock({
    snapshot,
    round,
    self,
    soundEnabled,
    hapticsEnabled,
    lastTickSecondRef,
  });

  const {
    activeSettingsVote,
    canProposeSettings,
    hostCanProposeSettings,
    canOpenSettingsModal,
    otherEligiblePlayerName,
    isCollapsed,
    toggleCollapseVoteBanner,
    castSettingsVote,
    saveRoomSettings,
    proposeRoomSettings,
  } = useMultiplayerVoting({
    client,
    snapshot,
    selfPlayerId,
    isAdmin,
    isSelfPaused: Boolean(self?.paused),
    eligibleVotePlayersCount,
    onClearActionError: () => setActionError(null),
    onCloseSettings: () => setShowSettings(false),
  });

  const {
    showStandings,
    setShowStandings,
    standingsScope,
    setStandingsScope,
  } = useMultiplayerStandings(snapshot?.players);

  const {
    localPinGuess,
    setLocalPinGuess,
    pendingPause,
    hasAnswered,
    isSelfPaused,
    isRoomPaused,
    isChoiceMode,
    togglePause,
    confirmSpectating,
    usePowerUp,
    sendReaction,
    submitMapAnswer,
    submitChoice,
    isCorrectChoice,
  } = useMultiplayerGameplay({
    client,
    snapshot,
    round,
    self,
    countries,
    soundEnabled,
    hapticsEnabled,
    runAction,
    setActionError,
  });

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
    () =>
      buildMultiplayerMapState(snapshot, round, self, localPinGuess),
    [snapshot, round, self, localPinGuess],
  );

  const gameUi = useMemo(
    () => buildMultiplayerGameUi(state.lastAnswerResult),
    [state.lastAnswerResult],
  );

  const targetMapAnchor = useMemo(
    () => resolveMultiplayerMapAnchor(snapshot, round),
    [snapshot, round],
  );

  const renderVoteBanner = () => {
    if (!activeSettingsVote || !selfPlayerId) return null;

    return (
      <SettingsVoteBanner
        collapsed={isCollapsed}
        connected={state.status === "connected"}
        currentConfig={snapshot?.pendingConfig ?? snapshot!.config}
        isSelfPaused={isSelfPaused}
        nowMs={now === 0 ? activeSettingsVote.createdAt : now}
        onToggleCollapse={toggleCollapseVoteBanner}
        onVote={castSettingsVote}
        otherEligiblePlayerName={otherEligiblePlayerName}
        selfPlayerId={selfPlayerId}
        variant="floating"
        vote={activeSettingsVote}
      />
    );
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

  const handleStartMatch = useCallback(() => {
    if (!snapshot) return;
    setStartingFromRevision(snapshot.revision);
    void runAction(async () => {
      try {
        client.startRoom();
      } catch (error) {
        setStartingFromRevision(null);
        throw error;
      }
    });
  }, [client, runAction, snapshot]);

  const leave = () =>
    runAction(async () => {
      await client.leaveRoom();
      clearInviteRoomId();
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
        <MultiplayerLandingActions
          onOpenEntry={() => setShowEntry(true)}
          onPlayOffline={onPlayOffline}
          showHomeActions={showHomeActions && !showEntry}
          visibleError={!showEntry ? visibleError : null}
        />
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
              clearInviteRoomId();
            })
          }
          onJoin={joinInvitedRoom}
          onOpenEntryPage={() => dismissInvite(true)}
          onPlayerNameChange={setPlayerName}
          onRetryInspect={retryInspect}
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

          <MultiplayerHeader
            canProposeSettings={canProposeSettings}
            connectionStatus={state.status}
            hasActiveVote={Boolean(activeSettingsVote)}
            isAdmin={isAdmin}
            isSelfPaused={isSelfPaused}
            isUpdatingPause={isUpdatingPause}
            onCopyRoomCode={() => void copyRoomCode()}
            onLeave={() => void leave()}
            onOpenSettings={() => setShowSettings(true)}
            onRetryReconnect={() =>
              void runAction(async () => client.retryReconnect())
            }
            onTogglePause={() => togglePause(!isSelfPaused)}
            onToggleSound={() => setSoundEnabled((value) => !value)}
            onToggleStandings={() => setShowStandings((value) => !value)}
            reconnectRequired={Boolean(
              state.reconnectRequired && state.status === "error",
            )}
            roomSecret={room.roomSecret}
            showStandings={showStandings}
            snapshot={snapshot}
            soundEnabled={soundEnabled}
          />

          {snapshot.status !== "playing" && activeSettingsVote && selfPlayerId && (
            <div className="pointer-events-none absolute inset-x-3 top-14 z-30 mx-auto max-w-5xl md:inset-x-4 md:top-20">
              {renderVoteBanner()}
            </div>
          )}

          {snapshot.status === "waiting" ? (
            <MultiplayerWaitingLobby
              canProposeSettings={canProposeSettings}
              connectedPlayersCount={connectedPlayersCount}
              hasActiveVote={Boolean(activeSettingsVote)}
              isAdmin={isAdmin}
              isConnected={state.status === "connected"}
              isStartingGame={isStartingGame}
              onCopyRoomCode={() => void copyRoomCode()}
              onOpenSettings={() => setShowSettings(true)}
              onStartGame={handleStartMatch}
              roomSecret={room.roomSecret}
              selfPlayerId={room.playerId}
              snapshot={snapshot}
            />
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
              onStartNextLegNow={handleStartMatch}
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
                onPlayAgain={handleStartMatch}
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
              <MultiplayerStandingsDrawer
                legNumber={snapshot.game.legNumber}
                onClose={() => setShowStandings(false)}
                onScopeChange={setStandingsScope}
                players={snapshot.players}
                roundNumber={round?.number ?? 0}
                selfPlayerId={room.playerId}
                showStandings={showStandings}
                standingsScope={standingsScope}
              />

              <MultiplayerActiveRound
                hasAnswered={hasAnswered}
                isAdmin={isAdmin}
                isChoiceMode={isChoiceMode}
                isCorrectChoice={isCorrectChoice}
                isRoomPaused={isRoomPaused}
                isSelfPaused={isSelfPaused}
                isUpdatingPause={isUpdatingPause}
                lastAnswerResult={state.lastAnswerResult}
                onConfirmSpectating={confirmSpectating}
                onReveal={() =>
                  void runAction(async () => {
                    await client.submitCommand({ type: "reveal" });
                  })
                }
                onSendReaction={sendReaction}
                onSubmitChoice={submitChoice}
                onTogglePause={togglePause}
                onUsePowerUp={usePowerUp}
                pauseRemainingMs={pauseRemainingMs}
                remainingTime={remainingTime}
                round={round}
                roundRemainingMs={roundRemainingMs}
                self={self}
                selfPlayerId={selfPlayerId}
                snapshot={snapshot}
                spectatorPromptRemainingMs={spectatorPromptRemainingMs}
                visibleSettingsNotice={visibleSettingsNotice}
                voteBanner={
                  activeSettingsVote && selfPlayerId ? renderVoteBanner() : null
                }
                waitingForCommand={waitingForCommand}
              />
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
            <MultiplayerSettingsModal
              hostCanProposeSettings={hostCanProposeSettings}
              isAdmin={isAdmin}
              onClose={() => setShowSettings(false)}
              onPropose={proposeRoomSettings}
              onSave={saveRoomSettings}
              snapshot={snapshot}
            />
          )}
        </section>
      )}
    </>
  );
};
