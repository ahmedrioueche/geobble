import type React from "react";
import { Loader2, Pause, Play } from "lucide-react";

interface MatchPausedOverlayProps {
  pausedPlayerNames: string[];
  selfPaused: boolean;
  remainingMs: number | null;
  updatingPause: boolean;
  onResume: () => void;
}

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

export const MatchPausedOverlay: React.FC<MatchPausedOverlayProps> = ({
  pausedPlayerNames,
  selfPaused,
  remainingMs,
  updatingPause,
  onResume,
}) => {
  const namesLabel =
    pausedPlayerNames.length > 0 ? pausedPlayerNames.join(", ") : "a player";

  return (
    <div
      aria-label="Match paused"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 top-12 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md md:top-16"
      role="status"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/25 bg-slate-900/95 p-7 text-center shadow-[0_0_60px_rgba(251,191,36,0.18)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl"
        />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-pulse rounded-full border border-amber-400/35 bg-amber-400/10"
          />
          <Pause aria-hidden="true" className="h-7 w-7 text-amber-300" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
          Timers frozen · Prompt hidden
        </p>
        <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-white">
          Match Paused
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/65">
          {selfPaused
            ? "You paused the match. Resume whenever you're ready to continue."
            : `Waiting for ${namesLabel} to resume so at least 2 players are active…`}
        </p>

        {remainingMs !== null && (
          <p className="mt-3 font-mono text-xs font-black text-amber-200">
            Auto-resumes in {formatCountdown(remainingMs)}
          </p>
        )}

        {selfPaused && (
          <button
            aria-busy={updatingPause}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={updatingPause}
            onClick={onResume}
            type="button"
          >
            {updatingPause ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Play aria-hidden="true" className="h-4 w-4 fill-current" />
            )}
            <span>{updatingPause ? "Resuming…" : "Resume match"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

