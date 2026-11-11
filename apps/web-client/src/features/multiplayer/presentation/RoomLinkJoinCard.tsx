import { useState } from "react";
import type React from "react";
import { Eye, EyeOff, Globe, Loader2, Lock, Users, X } from "lucide-react";
import type { RoomInspectResult } from "../contracts/multiplayerRoomProtocol";
import { RoomTextField } from "./RoomTextField";

interface RoomLinkJoinCardProps {
  roomId: string;
  playerName: string;
  roomSecret: string;
  inspecting: boolean;
  inspectError: string | null;
  inspected: RoomInspectResult | null;
  busy: boolean;
  joinError: string | null;
  reconnectAvailable: boolean;
  onPlayerNameChange: (value: string) => void;
  onRoomSecretChange: (value: string) => void;
  onJoin: () => void;
  onRetryInspect: () => void;
  onOpenEntryPage: () => void;
  onConnectLatestRoom: () => void;
  onClose: () => void;
}

const formatRoomStatus = (status: RoomInspectResult["status"]): string => {
  switch (status) {
    case "waiting":
      return "Waiting in lobby";
    case "playing":
      return "Match in progress";
    case "checkpoint":
      return "At checkpoint break";
    case "finished":
      return "Match finished";
  }
};

export const RoomLinkJoinCard: React.FC<RoomLinkJoinCardProps> = ({
  roomId,
  playerName,
  roomSecret,
  inspecting,
  inspectError,
  inspected,
  busy,
  joinError,
  reconnectAvailable,
  onPlayerNameChange,
  onRoomSecretChange,
  onJoin,
  onRetryInspect,
  onOpenEntryPage,
  onConnectLatestRoom,
  onClose,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const isFull =
    inspected !== null && inspected.playerCount >= inspected.maxPlayers;
  const requiresSecret = inspected?.requiresSecret ?? false;
  const canSubmit =
    !busy &&
    !isFull &&
    Boolean(playerName.trim()) &&
    (!requiresSecret || Boolean(roomSecret.trim()));

  return (
    <section
      aria-label={`Join room ${roomId}`}
      className="fixed inset-0 z-[125] overflow-y-auto bg-slate-950/95 text-white backdrop-blur-3xl"
    >
      <button
        aria-label="Close room invite"
        className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-900/90 text-white/70 shadow-md transition hover:border-white/30 hover:bg-slate-800 hover:text-white active:scale-90"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={22} />
      </button>

      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-16">
        <header className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
            Room invite link
          </p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tighter text-white sm:text-4xl">
            JOIN ROOM <span className="font-mono text-[var(--color-accent)]">{roomId}</span>
          </h1>
        </header>

        <div className="rounded-2xl border-2 border-white/15 bg-slate-900/90 p-6 shadow-2xl md:p-7">
          {inspecting ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
              <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-sky-300" />
              <p className="text-sm font-bold text-white/80">
                Checking room {roomId}…
              </p>
            </div>
          ) : inspectError ? (
            <div className="space-y-4 text-center">
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
                {inspectError}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10"
                  onClick={onRetryInspect}
                  type="button"
                >
                  Try again
                </button>
                <button
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-sky-400 px-4 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-sky-300"
                  onClick={onOpenEntryPage}
                  type="button"
                >
                  Open multiplayer menu
                </button>
              </div>
            </div>
          ) : inspected ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) onJoin();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                    inspected.visibility === "public"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-200"
                  }`}
                >
                  {inspected.visibility === "public" ? (
                    <Globe aria-hidden="true" size={12} />
                  ) : (
                    <Lock aria-hidden="true" size={12} />
                  )}
                  {inspected.visibility} room
                </span>
                <div className="flex items-center gap-3 text-xs font-bold text-white/70">
                  <span>{formatRoomStatus(inspected.status)}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-sky-200">
                    <Users aria-hidden="true" size={13} />
                    {inspected.playerCount}/{inspected.maxPlayers}
                  </span>
                </div>
              </div>

              {reconnectAvailable && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300/25 bg-sky-400/10 px-3.5 py-2.5 text-xs text-sky-100">
                  <span>Joining replaces your saved room session.</span>
                  <button
                    className="font-black uppercase text-sky-300 underline hover:text-sky-200"
                    disabled={busy}
                    onClick={onConnectLatestRoom}
                    type="button"
                  >
                    Resume saved
                  </button>
                </div>
              )}

              {isFull ? (
                <div className="space-y-4 text-center">
                  <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="alert">
                    This room is currently full ({inspected.playerCount}/
                    {inspected.maxPlayers} players).
                  </p>
                  <button
                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-4 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-sky-300"
                    onClick={onOpenEntryPage}
                    type="button"
                  >
                    Browse other multiplayer options
                  </button>
                </div>
              ) : (
                <>
                  <RoomTextField
                    autoComplete="nickname"
                    label="Player name"
                    maxLength={24}
                    onChange={onPlayerNameChange}
                    placeholder="Enter player name"
                    value={playerName}
                  />

                  {requiresSecret && (
                    <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                      Room secret
                      <div className="relative mt-2">
                        <input
                          autoComplete="off"
                          autoFocus={Boolean(playerName.trim())}
                          className="h-14 w-full rounded-xl border border-white/15 bg-slate-950/70 pl-4 pr-12 text-base font-medium text-white outline-none transition placeholder:text-white/30 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/15"
                          maxLength={24}
                          onChange={(event) =>
                            onRoomSecretChange(event.target.value)
                          }
                          placeholder="Enter room secret"
                          title="Room secret"
                          type={showSecret ? "text" : "password"}
                          value={roomSecret}
                        />
                        <button
                          aria-label={
                            showSecret ? "Hide room secret" : "Show room secret"
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                          onClick={() => setShowSecret((value) => !value)}
                          type="button"
                        >
                          {showSecret ? (
                            <EyeOff aria-hidden="true" size={18} />
                          ) : (
                            <Eye aria-hidden="true" size={18} />
                          )}
                        </button>
                      </div>
                    </label>
                  )}

                  {joinError && (
                    <p
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200"
                      role="alert"
                    >
                      {joinError}
                    </p>
                  )}

                  <button
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 px-5 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(56,189,248,0.3)] transition hover:from-sky-300 hover:to-blue-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-white/35 disabled:shadow-none"
                    disabled={!canSubmit}
                    type="submit"
                  >
                    {busy && (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {busy
                        ? "Joining room…"
                        : requiresSecret
                          ? "Join private room"
                          : "Join public room"}
                    </span>
                  </button>

                  <button
                    className="block w-full text-center text-xs font-bold uppercase tracking-wider text-white/55 transition hover:text-white"
                    onClick={onOpenEntryPage}
                    type="button"
                  >
                    Other multiplayer options
                  </button>
                </>
              )}
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
};

