import { X } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { RoomTextField } from "./RoomTextField";

type RoomVisibility = "public" | "private";
type RoomAction = "matchmake" | "create" | "join";

interface RoomEntryPageProps {
  playerName: string;
  roomCode: string;
  visibility: RoomVisibility;
  busy: boolean;
  blocked: boolean;
  status: string;
  error: string | null;
  reconnectAvailable: boolean;
  reconnectRequired: boolean;
  onPlayerNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onVisibilityChange: (value: RoomVisibility) => void;
  onCreate: () => void;
  onJoin: () => void;
  onMatchmake: () => void;
  onClose: () => void;
  onRetryReconnect: () => void;
  onForgetReconnect: () => void;
}

const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { highlighted: boolean }
> = ({ children, className = "", highlighted, ...props }) => (
  <button
    className={`flex min-h-14 items-center justify-center rounded-xl border-2 px-5 text-sm font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-white/35 disabled:shadow-none disabled:hover:border-white/10 disabled:hover:from-slate-800 disabled:hover:via-slate-800 disabled:hover:to-slate-800 ${
      highlighted
        ? "border-white/30 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 text-slate-950 shadow-[0_0_32px_rgba(56,189,248,0.3)] hover:from-sky-300 hover:to-blue-500"
        : "border-white/20 bg-slate-800/80 text-white/70 hover:border-white/30 hover:bg-gradient-to-r hover:from-sky-400 hover:via-sky-500 hover:to-blue-600 hover:text-slate-950 hover:shadow-[0_0_32px_rgba(56,189,248,0.3)]"
    } ${className}`}
    type="button"
    {...props}
  >
    {children}
  </button>
);

const VisibilityToggle: React.FC<{
  value: RoomVisibility;
  onChange: (value: RoomVisibility) => void;
}> = ({ value, onChange }) => (
  <fieldset>
    <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/65">
      Room visibility
    </legend>
    <div className="grid grid-cols-2 gap-3">
      {(["private", "public"] as const).map((visibility) => (
        <button
          aria-pressed={value === visibility}
          className={`min-h-12 rounded-xl border px-4 text-sm font-bold capitalize transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-white/40 ${
            value === visibility
              ? "border-sky-300/70 bg-sky-300/10 text-sky-100"
              : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25"
          }`}
          key={visibility}
          onClick={() => onChange(visibility)}
          type="button"
        >
          {visibility}
        </button>
      ))}
    </div>
  </fieldset>
);

export const RoomEntryPage: React.FC<RoomEntryPageProps> = ({
  playerName,
  roomCode,
  visibility,
  busy,
  blocked,
  status,
  error,
  reconnectAvailable,
  reconnectRequired,
  onPlayerNameChange,
  onRoomCodeChange,
  onVisibilityChange,
  onCreate,
  onJoin,
  onMatchmake,
  onClose,
  onRetryReconnect,
  onForgetReconnect,
}) => {
  const canStart = Boolean(playerName.trim()) && !busy && !blocked;
  const [activeCard, setActiveCard] = useState<RoomAction>("create");
  const cardProps = (card: RoomAction) => ({
    onFocusCapture: () => setActiveCard(card),
    onMouseEnter: () => setActiveCard(card),
    onMouseLeave: () => setActiveCard("create"),
  });
  const isActive = (card: RoomAction) => activeCard === card;

  return (
    <section
      aria-label="Multiplayer room options"
      className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/95 text-white backdrop-blur-3xl"
    >
      <button
        aria-label="Close multiplayer"
        className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-900/90 text-white/70 shadow-md transition hover:border-white/30 hover:bg-slate-800 hover:text-white active:scale-90"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={22} />
      </button>

      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-5 py-20 md:px-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white sm:text-5xl">
            GEOBBLE <span className="text-[var(--color-accent)]">MULTIPLAYER</span>
          </h1>
        </header>

        <div className="mx-auto mb-6 w-full max-w-md">
          <RoomTextField
            autoComplete="nickname"
            label="Player name"
            maxLength={24}
            onChange={onPlayerNameChange}
            placeholder="Enter player name"
            value={playerName}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <article
            {...cardProps("matchmake")}
            className={`flex flex-col rounded-2xl border-2 p-6 transition-all md:p-7 ${
              isActive("matchmake")
                ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.15)]"
                : "border-white/20 bg-slate-900/80"
            }`}
          >
            <div className="mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight">Join a public game</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                We&apos;ll find an open room or start one for you.
              </p>
            </div>
            <ActionButton
              className="mt-auto w-full"
              disabled={!canStart}
              highlighted={isActive("matchmake")}
              onClick={onMatchmake}
            >
              Join public game
            </ActionButton>
          </article>

          <article
            {...cardProps("create")}
            className={`rounded-2xl border-2 p-6 transition-all md:p-7 ${
              isActive("create")
                ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.15)]"
                : "border-white/20 bg-slate-900/80"
            }`}
          >
            <div className="mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight">Create a room</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Choose whether anyone can join or keep it private.
              </p>
            </div>
            <div className="space-y-5">
              <VisibilityToggle
                onChange={onVisibilityChange}
                value={visibility}
              />
              <ActionButton
                className="w-full"
                disabled={!canStart}
                highlighted={isActive("create")}
                onClick={onCreate}
              >
                Create {visibility} room
              </ActionButton>
            </div>
          </article>

          <article
            {...cardProps("join")}
            className={`rounded-2xl border-2 p-6 transition-all md:p-7 ${
              isActive("join")
                ? "border-[var(--color-accent)] bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.15)]"
                : "border-white/20 bg-slate-900/80"
            }`}
          >
            <div className="mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight">Join with a code</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Enter the room code shared by your friend.
              </p>
            </div>
            <div className="space-y-5">
              <RoomTextField
                autoCapitalize="characters"
                label="Room code"
                maxLength={12}
                onChange={onRoomCodeChange}
                placeholder="Enter room code"
                value={roomCode}
              />
              <ActionButton
                className="w-full"
                disabled={!canStart || !roomCode.trim()}
                highlighted={isActive("join")}
                onClick={onJoin}
              >
                Join room
              </ActionButton>
            </div>
          </article>
        </div>

        {error && (
          <p className="mt-6 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p className="mt-6 text-center text-sm text-sky-200" role="status">
            {status === "reconnecting"
              ? "Reconnecting to your saved room…"
              : "Connecting to the room server…"}
          </p>
        )}
        {reconnectAvailable && (
          <div className="mt-5 flex flex-wrap justify-center gap-5">
            {reconnectRequired && status === "error" && (
              <button
                className="text-xs font-bold text-sky-300 underline hover:text-sky-100"
                onClick={onRetryReconnect}
                type="button"
              >
                Retry reconnect
              </button>
            )}
            <button
              className="text-xs font-bold text-white/45 underline hover:text-white"
              onClick={onForgetReconnect}
              type="button"
            >
              Forget saved room
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
