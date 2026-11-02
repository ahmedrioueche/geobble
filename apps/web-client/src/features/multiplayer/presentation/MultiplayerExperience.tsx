import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { CountryData } from "../../../data/country-data";
import { resolveMapCountry } from "../../game/domain/gameRules";
import { WorldMap } from "../../map/WorldMap";
import type { WorldMapGameState } from "../../map/worldMapStoreSelectors";
import type { RoomConnectInput } from "../contracts/multiplayerRoomProtocol";
import { useRoomClient } from "../application/useRoomClient";
import { RoomSettingsForm } from "./RoomSettingsForm";

interface MultiplayerExperienceProps {
  countries: CountryData[];
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
}) => {
  const { client, state } = useRoomClient();
  const [showEntry, setShowEntry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [localPinGuess, setLocalPinGuess] = useState<{
    missionId: string;
    location: [number, number];
  } | null>(null);
  const [now, setNow] = useState(0);
  const room = state.room;
  const snapshot = room?.snapshot;
  const round = snapshot?.game.round ?? null;
  const self = getPlayer(room, room?.playerId ?? null);
  const isAdmin = self?.isAdmin ?? false;
  const hasAnswered = self?.answered ?? false;
  const waitingForCommand = state.pendingCommandIds.length > 0;
  const isPinLocate =
    snapshot?.config.mode === "pin" &&
    snapshot.config.pinDirection === "locate";
  const isChoiceMode =
    snapshot?.config.mode === "reverse" ||
    (snapshot?.config.mode === "pin" &&
      snapshot.config.pinDirection === "identify");

  useEffect(() => {
    if (snapshot?.status !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [snapshot?.status, snapshot?.game.timerDeadlineAt]);

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

  const connect = (input: RoomConnectInput) =>
    runAction(async () => {
      if (input.type === "create") {
        await client.createRoom(input.playerName, input.config);
      } else {
        await client.joinRoom(input.roomId, input.playerName);
      }
      setShowEntry(false);
      setRoomCode("");
    });

  const submitMapAnswer = (
    name: string,
    code: string,
    coordinates?: [number, number],
  ) => {
    if (!snapshot || snapshot.status !== "playing" || !round || hasAnswered) {
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
    if (!isChoiceMode || !round || hasAnswered) return;
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
      {!room && (
        <>
          <div className="fixed right-3 top-16 z-[70] md:right-6 md:top-20">
            <button
              className="rounded-xl border border-sky-300/40 bg-slate-950/90 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-200 shadow-xl hover:bg-slate-800"
              onClick={() => setShowEntry(true)}
              type="button"
            >
              Multiplayer
            </button>
          </div>
          {state.error && !showEntry && (
            <p
              className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-lg border border-rose-300/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-rose-200"
              role="alert"
            >
              {state.error}
            </p>
          )}
        </>
      )}

      {showEntry && !room && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wide text-white">
                  Multiplayer
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Create a room or join with a room code.
                </p>
              </div>
              <button
                className="rounded-lg px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white"
                onClick={() => setShowEntry(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-white/70">
              Player name
              <input
                autoComplete="nickname"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white outline-none focus:border-sky-400"
                maxLength={24}
                onChange={(event) => setPlayerName(event.target.value)}
                value={playerName}
              />
            </label>

            <button
              className="w-full rounded-xl bg-sky-400 px-4 py-3 font-black uppercase text-slate-950 disabled:opacity-40"
              disabled={
                !playerName.trim() ||
                state.status === "connecting" ||
                state.status === "reconnecting" ||
                state.reconnectRequired
              }
              onClick={() =>
                void connect({ type: "create", playerName })
              }
              type="button"
            >
              Create room
            </button>

            <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-white/35">
              <div className="h-px flex-1 bg-white/10" />
              or join
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex gap-2">
              <input
                aria-label="Room code"
                autoCapitalize="characters"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 p-3 uppercase text-white outline-none focus:border-sky-400"
                maxLength={12}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="ROOM CODE"
                value={roomCode}
              />
              <button
                className="rounded-xl border border-white/15 px-4 font-black text-white disabled:opacity-40"
                disabled={
                  !playerName.trim() ||
                  !roomCode.trim() ||
                  state.status === "connecting" ||
                  state.status === "reconnecting" ||
                  state.reconnectRequired
                }
                onClick={() =>
                  void connect({
                    type: "join",
                    roomId: roomCode,
                    playerName,
                  })
                }
                type="button"
              >
                Join
              </button>
            </div>
            {(actionError || state.error) && (
              <p className="mt-4 text-sm text-rose-300" role="alert">
                {actionError ?? state.error}
              </p>
            )}
            {state.reconnectAvailable && !room && (
              <div className="mt-4 flex justify-center gap-5">
                {state.reconnectRequired && state.status === "error" && (
                  <button
                    className="text-xs font-bold text-sky-300 underline hover:text-sky-100"
                    onClick={() =>
                      void runAction(async () => client.retryReconnect())
                    }
                    type="button"
                  >
                    Retry reconnect
                  </button>
                )}
                <button
                  className="text-xs font-bold text-white/45 underline hover:text-white"
                  onClick={() => client.forgetReconnect()}
                  type="button"
                >
                  Forget saved room
                </button>
              </div>
            )}
            {state.status === "connecting" && (
              <p className="mt-4 text-center text-xs text-sky-200">
                Connecting to room server…
              </p>
            )}
          </div>
        </div>
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

          <header className="absolute inset-x-0 top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl md:px-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                Geobble multiplayer
              </p>
              <p className="font-mono text-lg font-black tracking-[0.15em]">
                {snapshot.roomId}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold uppercase ${state.status === "connected" ? "text-emerald-300" : "text-amber-300"}`}
              >
                {state.status}
              </span>
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
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-black uppercase text-white/80 hover:bg-white/10"
                disabled={state.status !== "connected"}
                onClick={() => void leave()}
                type="button"
              >
                Leave room
              </button>
            </div>
          </header>

          {snapshot.status === "waiting" ? (
            <div className="absolute inset-x-4 bottom-5 top-24 z-20 mx-auto grid max-w-5xl gap-4 overflow-y-auto md:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-black uppercase tracking-wider">Players</h2>
                  <span className="text-xs text-white/50">
                    {snapshot.players.length} players
                  </span>
                </div>
                <ul className="space-y-2">
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
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-black uppercase hover:bg-white/10"
                    disabled={state.status !== "connected"}
                    onClick={() =>
                      void runAction(async () =>
                        client.setReady(!self?.ready),
                      )
                    }
                    type="button"
                  >
                    {self?.ready ? "Not ready" : "Ready"}
                  </button>
                  {isAdmin && (
                    <button
                      className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 disabled:opacity-40"
                      disabled={
                        state.status !== "connected" ||
                        snapshot.players.length < 2 ||
                        snapshot.players.some(
                          (player) => !player.connected || !player.ready,
                        )
                      }
                      onClick={() =>
                        void runAction(async () => client.startRoom())
                      }
                      type="button"
                    >
                      Start game
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="w-full rounded-xl border border-sky-300/30 px-4 py-3 text-xs font-black uppercase text-sky-200 hover:bg-sky-300/10"
                      disabled={state.status !== "connected"}
                      onClick={() => setShowSettings(true)}
                      type="button"
                    >
                      Room settings
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center backdrop-blur-xl">
                <div>
                  <p className="text-4xl">🌍</p>
                  <h2 className="mt-3 text-xl font-black uppercase">
                    Waiting for the match
                  </h2>
                  <p className="mt-2 text-sm text-white/55">
                    Share the room code with a friend. The admin can start when
                    everyone is ready.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <aside className="absolute left-3 top-24 z-20 max-h-[45vh] w-48 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/90 p-3 backdrop-blur-xl md:left-6 md:w-60">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-300">
                  Standings · Round {round?.number ?? 0}
                </p>
                <ul className="space-y-2">
                  {[...snapshot.players]
                    .sort((first, second) => second.score - first.score)
                    .map((player) => (
                      <li
                        className="flex items-center justify-between gap-2 text-xs"
                        key={player.id}
                      >
                        <span className="truncate font-bold">
                          {player.name}
                          {player.id === room.playerId ? " (you)" : ""}
                        </span>
                        <span className="font-mono font-black text-sky-200">
                          {player.score}
                        </span>
                      </li>
                    ))}
                </ul>
              </aside>

              <div className="absolute right-3 top-24 z-20 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl md:right-6 md:top-24 md:p-5">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sky-300">
                  <span>{snapshot.config.mode} mission</span>
                  <span>
                    {remainingTime === null
                      ? `${round?.number ?? 0}${snapshot.config.challengeType === "count" ? ` / ${snapshot.config.challengeValue}` : ""}`
                      : formatTime(remainingTime)}
                  </span>
                </div>
                <p className="text-sm font-bold uppercase leading-relaxed md:text-base">
                  {round?.prompt.value ?? "Waiting for the next round"}
                </p>
                {round?.revealed && round.answerReveal && (
                  <p className="mt-2 text-xs font-black uppercase text-emerald-300">
                    Answer: {round.answerReveal.countryName}
                  </p>
                )}
                {state.lastAnswerResult !== null && (
                  <p
                    className={`mt-2 text-xs font-black uppercase ${state.lastAnswerResult ? "text-emerald-300" : "text-rose-300"}`}
                    role="status"
                  >
                    {state.lastAnswerResult ? "Correct answer" : "Answer submitted"}
                  </p>
                )}
                {state.settingsAccepted && (
                  <p className="mt-2 text-[10px] font-bold text-amber-200">
                    Settings {state.settingsAccepted.queued ? "queued for the next round" : "updated"}.
                  </p>
                )}
                {isChoiceMode && round && !round.revealed && (
                  <div className="mt-4 grid gap-2">
                    {round.choices.map((choice) => (
                      <button
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left text-xs font-black uppercase hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40"
                        disabled={hasAnswered || waitingForCommand}
                        key={choice.id}
                        onClick={() => submitChoice(choice.id)}
                        type="button"
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
                {isPinLocate && !hasAnswered && (
                  <p className="mt-3 text-[10px] font-bold uppercase text-white/50">
                    Click the country on the map to place your pin.
                  </p>
                )}
                {hasAnswered && !round?.revealed && (
                  <p className="mt-3 text-[10px] font-bold uppercase text-white/45">
                    Answer submitted — waiting for the round to finish.
                  </p>
                )}
                {isAdmin && !round?.revealed && (
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase hover:bg-white/10 disabled:opacity-40"
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
                    <button
                      className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase hover:bg-white/10 disabled:opacity-40"
                      disabled={waitingForCommand}
                      onClick={() =>
                        void runAction(async () => {
                          await client.submitCommand({ type: "skip" });
                        })
                      }
                      type="button"
                    >
                      Skip
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <button
                    className="mt-3 w-full text-[10px] font-black uppercase text-sky-300 hover:text-sky-100"
                    disabled={state.status !== "connected"}
                    onClick={() => setShowSettings(true)}
                    type="button"
                  >
                    Change settings
                  </button>
                )}
              </div>
            </>
          )}

          {(actionError || state.error) && (
            <p
              className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-rose-300/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-rose-200"
              role="alert"
            >
              {actionError ?? state.error}
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
                  onSave={(configuration) => {
                    void runAction(async () => {
                      client.changeSettings(configuration);
                      setShowSettings(false);
                    });
                  }}
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
