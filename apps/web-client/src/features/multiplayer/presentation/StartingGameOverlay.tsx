import type React from "react";
import { Globe, Loader2 } from "lucide-react";

interface StartingGameOverlayProps {
  playerCount: number;
  modeLabel?: string;
}

export const StartingGameOverlay: React.FC<StartingGameOverlayProps> = ({
  playerCount,
  modeLabel,
}) => {
  return (
    <div
      aria-label="Starting game"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      role="status"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-sky-400/25 bg-slate-900/95 p-7 text-center shadow-[0_0_60px_rgba(56,189,248,0.22)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl"
        />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-sky-400/20"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-sky-400/35 bg-sky-400/10"
          />
          <Globe aria-hidden="true" className="h-7 w-7 text-sky-300" />
          <Loader2
            aria-hidden="true"
            className="absolute inset-0 h-16 w-16 animate-spin text-sky-400/80"
            strokeWidth={1.5}
          />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-300">
          {modeLabel ? `${modeLabel} match` : "Multiplayer match"}
        </p>
        <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-white">
          Starting Game
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          Preparing round 1 for {playerCount}{" "}
          {playerCount === 1 ? "player" : "players"}…
        </p>

        <div
          aria-hidden="true"
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500" />
        </div>
      </div>
    </div>
  );
};

