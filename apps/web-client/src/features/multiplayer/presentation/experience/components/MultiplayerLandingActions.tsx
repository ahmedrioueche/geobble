import type React from "react";

interface MultiplayerLandingActionsProps {
  onPlayOffline: () => void;
  onOpenEntry: () => void;
  showHomeActions?: boolean;
  visibleError: string | null;
}

export const MultiplayerLandingActions: React.FC<
  MultiplayerLandingActionsProps
> = ({ onPlayOffline, onOpenEntry, showHomeActions = true, visibleError }) => {
  return (
    <>
      {showHomeActions && (
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
            onClick={onOpenEntry}
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
      {visibleError && (
        <p
          className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-lg border border-rose-300/30 bg-slate-950/95 px-4 py-2 text-center text-xs text-rose-200 md:bottom-4"
          role="alert"
        >
          {visibleError}
        </p>
      )}
    </>
  );
};
