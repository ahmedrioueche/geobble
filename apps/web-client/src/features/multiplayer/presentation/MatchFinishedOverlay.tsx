import { Loader2, Play, Trophy } from "lucide-react";
import type React from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import { RoomSettingsPanel } from "./RoomSettingsPanel";

interface MatchFinishedOverlayProps {
  snapshot: RoomSnapshot;
  selfPlayerId: string | null;
  isAdmin: boolean;
  connectedPlayersCount: number;
  connected: boolean;
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
      className="absolute inset-x-4 bottom-5 top-16 z-20 mx-auto grid max-w-5xl gap-4 overflow-y-auto md:top-24 md:grid-cols-[1.2fr_1fr]"
    >
      <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Trophy aria-hidden="true" size={13} />
              Final standings
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
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
          className="max-h-[42vh] space-y-2 overflow-y-auto overscroll-contain pr-1"
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
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  isSelf
                    ? "border-sky-400/45 bg-sky-400/10"
                    : isWinner
                      ? "border-amber-300/30 bg-amber-300/5"
                      : "border-white/5 bg-white/5"
                }`}
                key={player.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 shrink-0 text-center text-base font-black">
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
                <span className="shrink-0 font-mono text-base font-black text-sky-200">
                  {player.score} <span className="text-[10px] text-white/45">pts</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
            Celebrate
          </span>
          <div className="flex items-center gap-1.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                aria-label={`React with ${emoji}`}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-base transition hover:scale-110 hover:border-sky-300/40 hover:bg-sky-300/15"
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

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
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
          config={snapshot.config}
          isAdmin={isAdmin}
          onEdit={onOpenSettings}
          pendingConfig={snapshot.pendingConfig}
        />
      </div>
    </div>
  );
};

