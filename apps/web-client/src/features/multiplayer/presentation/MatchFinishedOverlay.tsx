import { Loader2, Play, Trophy } from "lucide-react";
import type React from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import {
  RoomQuickSettingsBar,
  RoomSettingsPanel,
} from "./RoomSettingsPanel";

interface MatchFinishedOverlayProps {
  snapshot: RoomSnapshot;
  selfPlayerId: string | null;
  isAdmin: boolean;
  connectedPlayersCount: number;
  connected: boolean;
  canProposeSettings?: boolean;
  hasActiveVote?: boolean;
  isStartingRematch: boolean;
  onPlayAgain: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  onSendReaction: (emoji: ReactionEmoji) => void;
}

const getRankBadge = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const getModeLabel = (snapshot: RoomSnapshot): string => {
  const { mode, pinDirection } = snapshot.config;
  if (mode === "pin") {
    return pinDirection === "locate" ? "Pin · Locate" : "Pin · Identify";
  }
  return mode === "reverse" ? "Reverse" : "Identify";
};

export const MatchFinishedOverlay: React.FC<MatchFinishedOverlayProps> = ({
  snapshot,
  selfPlayerId,
  isAdmin,
  connectedPlayersCount,
  connected,
  canProposeSettings = false,
  hasActiveVote = false,
  isStartingRematch,
  onPlayAgain,
  onOpenSettings,
  onLeave,
  onSendReaction,
}) => {
  const sortedPlayers = [...snapshot.players].sort(
    (first, second) =>
      second.score - first.score ||
      second.maxStreak - first.maxStreak ||
      first.name.localeCompare(second.name),
  );
  const topScore = sortedPlayers[0]?.score ?? 0;
  const winners =
    topScore > 0
      ? sortedPlayers.filter((player) => player.score === topScore)
      : [];
  const adminName =
    snapshot.players.find((player) => player.id === snapshot.adminPlayerId)
      ?.name ?? "the host";
  const roundsPlayed = snapshot.game.round?.number ?? 0;

  let headline = "Match complete";
  if (winners.length === 1) {
    const winner = winners[0]!;
    headline =
      winner.id === selfPlayerId ? "You win!" : `${winner.name} wins!`;
  } else if (winners.length > 1) {
    const names = winners.map((winner) =>
      winner.id === selfPlayerId ? "You" : winner.name,
    );
    headline = `Tie for 1st · ${names.join(" & ")}`;
  }

  return (
    <div
      aria-label="Match results"
      className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto overflow-x-hidden bg-slate-950/95 backdrop-blur-xl md:inset-x-4 md:bottom-5 md:top-24 md:bg-transparent md:backdrop-blur-none"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-0 md:gap-4 md:p-0">
        <RoomQuickSettingsBar
          canPropose={canProposeSettings}
          config={snapshot.config}
          hasActiveVote={hasActiveVote}
          isAdmin={isAdmin}
          onOpenSettings={onOpenSettings}
          pendingConfig={snapshot.pendingConfig}
        />
        <div className="flex min-w-0 flex-col gap-3 md:grid md:min-h-0 md:grid-cols-[1.2fr_1fr] md:gap-4">
        <div className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-xl md:bg-slate-950/90 md:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                <Trophy aria-hidden="true" size={13} />
                Final standings
              </p>
              <h2 className="mt-1 break-words text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                {headline}
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">
                {getModeLabel(snapshot)} · {roundsPlayed}{" "}
                {roundsPlayed === 1 ? "round" : "rounds"}
              </p>
            </div>
          </div>

          <ol
            aria-label="Final standings"
            className="space-y-2 md:max-h-[42vh] md:overflow-y-auto md:overscroll-contain md:pr-1"
          >
            {sortedPlayers.map((player) => {
              const rank =
                sortedPlayers.findIndex(
                  (candidate) => candidate.score === player.score,
                ) + 1;
              const isSelf = player.id === selfPlayerId;
              const isWinner = topScore > 0 && player.score === topScore;
              return (
                <li
                  className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 sm:gap-3 sm:px-4 ${
                    isSelf
                      ? "border-sky-400/45 bg-sky-400/10"
                      : isWinner
                        ? "border-amber-300/30 bg-amber-300/5"
                        : "border-white/5 bg-white/5"
                  }`}
                  key={player.id}
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-black sm:w-7 sm:text-base">
                      {getRankBadge(rank)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {player.name}
                        {isSelf && (
                          <span className="ml-2 text-[10px] uppercase text-sky-300">
                            You
                          </span>
                        )}
                        {player.isAdmin && (
                          <span className="ml-2 text-[10px] font-black uppercase text-white/50">
                            Host
                          </span>
                        )}
                        {!player.connected && (
                          <span className="ml-2 text-[10px] uppercase text-rose-300">
                            Offline
                          </span>
                        )}
                      </p>
                      {player.maxStreak >= 2 && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                          🔥 Best streak: {player.maxStreak}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-black text-sky-200 sm:text-base">
                    {player.score} <span className="text-[10px] text-white/45">pts</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
              Celebrate
            </span>
            <div className="grid flex-1 grid-cols-6 gap-1 sm:flex sm:flex-initial sm:items-center sm:gap-1.5">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  aria-label={`React with ${emoji}`}
                  className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 py-1.5 text-base transition hover:scale-110 hover:border-sky-300/40 hover:bg-sky-300/15 sm:px-2.5"
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-xl md:bg-slate-950/90 md:p-5">
            {isAdmin ? (
              <>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Ready for another round?
                </h3>
                <p className="mt-1 text-xs text-white/55">
                  {connectedPlayersCount >= 2
                    ? "Start a fresh match with everyone in the room."
                    : "Waiting for another player to join to start a rematch."}
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    aria-busy={isStartingRematch}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      !connected || isStartingRematch || connectedPlayersCount < 2
                    }
                    onClick={onPlayAgain}
                    type="button"
                  >
                    {isStartingRematch ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 animate-spin"
                      />
                    ) : (
                      <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                    )}
                    <span>
                      {isStartingRematch ? "Starting rematch…" : "Play again"}
                    </span>
                  </button>
                  <button
                    className="min-h-10 w-full rounded-xl border border-white/15 px-4 py-2 text-xs font-black uppercase text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                    disabled={!connected}
                    onClick={onLeave}
                    type="button"
                  >
                    Leave room
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Rematch pending
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  Waiting for {adminName} to start a rematch…
                </p>
                <div
                  aria-label="Waiting for host to start a rematch"
                  className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                >
                  <div className="waiting-line-loader h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400/40 via-sky-300 to-sky-400/40" />
                </div>
                <button
                  className="mt-4 min-h-10 w-full rounded-xl border border-white/15 px-4 py-2 text-xs font-black uppercase text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                  disabled={!connected}
                  onClick={onLeave}
                  type="button"
                >
                  Leave room
                </button>
              </>
            )}
          </div>

          <RoomSettingsPanel
            canPropose={canProposeSettings}
            config={snapshot.config}
            hasActiveVote={hasActiveVote}
            isAdmin={isAdmin}
            onEdit={onOpenSettings}
            onPropose={onOpenSettings}
            pendingConfig={snapshot.pendingConfig}
          />
        </div>
        </div>
      </div>
    </div>
  );
};

