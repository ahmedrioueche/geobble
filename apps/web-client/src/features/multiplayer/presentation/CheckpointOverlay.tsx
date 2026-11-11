import {
  Flag,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type React from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import { RoomSettingsPanel } from "./RoomSettingsPanel";

interface CheckpointOverlayProps {
  snapshot: RoomSnapshot;
  selfPlayerId: string | null;
  isAdmin: boolean;
  connected: boolean;
  isAdvancingLeg: boolean;
  remainingMs: number;
  onStartNextLegNow: () => void;
  onToggleCountdownPause: () => void;
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

const formatTierLabel = (tier: string): string =>
  tier.charAt(0).toUpperCase() + tier.slice(1);

export const CheckpointOverlay: React.FC<CheckpointOverlayProps> = ({
  snapshot,
  selfPlayerId,
  isAdmin,
  connected,
  isAdvancingLeg,
  remainingMs,
  onStartNextLegNow,
  onToggleCountdownPause,
  onOpenSettings,
  onLeave,
  onSendReaction,
}) => {
  const [boardTab, setBoardTab] = useState<"leg" | "tour">("leg");
  const summary = snapshot.game.checkpointSummary;
  const legNumber = summary?.legNumber ?? snapshot.game.legNumber ?? 1;
  const nextLegNumber = summary?.nextLegNumber ?? legNumber + 1;
  const nextLegTier = summary?.nextLegTier ?? "medium";
  const nextLegMultiplier = summary?.nextLegMultiplier ?? 1.25;
  const lapNumber = summary?.lapNumber ?? snapshot.game.lapNumber ?? 1;
  const checkpointPaused = Boolean(snapshot.game.checkpointPaused);
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const progressPct = checkpointPaused
    ? 100
    : Math.min(100, Math.max(0, (remainingMs / 10_000) * 100));

  const legSorted = [...snapshot.players].sort(
    (first, second) =>
      (second.legScore ?? 0) - (first.legScore ?? 0) ||
      second.score - first.score ||
      first.name.localeCompare(second.name),
  );
  const tourSorted = [...snapshot.players].sort(
    (first, second) =>
      second.score - first.score ||
      (second.checkpointsWon ?? 0) - (first.checkpointsWon ?? 0) ||
      first.name.localeCompare(second.name),
  );

  const winnerIds = summary?.winnerIds ?? [];
  const winnerNames = winnerIds
    .map((id) => {
      if (id === selfPlayerId) return "You";
      return snapshot.players.find((player) => player.id === id)?.name;
    })
    .filter((name): name is string => Boolean(name));

  let headline = `Leg ${legNumber} complete`;
  if (winnerNames.length === 1) {
    headline =
      winnerNames[0] === "You"
        ? `You take Leg ${legNumber}!`
        : `${winnerNames[0]} takes Leg ${legNumber}!`;
  } else if (winnerNames.length > 1) {
    headline = `Leg ${legNumber} tie · ${winnerNames.join(" & ")}`;
  }

  const adminName =
    snapshot.players.find((player) => player.id === snapshot.adminPlayerId)
      ?.name ?? "the host";

  const activeList = boardTab === "leg" ? legSorted : tourSorted;

  return (
    <div
      aria-label="Checkpoint summary"
      className="absolute inset-x-4 bottom-5 top-16 z-20 mx-auto grid max-w-5xl gap-4 overflow-y-auto md:top-24 md:grid-cols-[1.25fr_1fr]"
    >
      <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <Flag aria-hidden="true" size={13} />
              Checkpoint · Leg {legNumber}
              {lapNumber > 1 ? ` · Lap ${lapNumber}` : ""}
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
              {headline}
            </h2>
          </div>

          <div
            aria-label={
              checkpointPaused
                ? "Checkpoint countdown paused"
                : `Next leg in ${remainingSec} seconds`
            }
            className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-right"
            role="status"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-200">
              {checkpointPaused
                ? "Countdown paused"
                : `Next leg in ${remainingSec}s`}
            </p>
            <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                  checkpointPaused ? "bg-amber-300" : "bg-sky-400"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3.5 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1 font-black uppercase text-amber-200">
            <Sparkles aria-hidden="true" size={14} />
            Up next: Leg {nextLegNumber}
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-white">
            {formatTierLabel(nextLegTier)}
          </span>
          <span className="rounded-md bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
            {nextLegMultiplier}x pts
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-sky-200">
            <Zap aria-hidden="true" size={12} />
            Power-ups recharged
          </span>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div
            aria-label="Leaderboard view"
            className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1"
            role="tablist"
          >
            <button
              aria-selected={boardTab === "leg"}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                boardTab === "leg"
                  ? "bg-sky-400 text-slate-950"
                  : "text-white/65 hover:text-white"
              }`}
              onClick={() => setBoardTab("leg")}
              role="tab"
              type="button"
            >
              Leg {legNumber}
            </button>
            <button
              aria-selected={boardTab === "tour"}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                boardTab === "tour"
                  ? "bg-sky-400 text-slate-950"
                  : "text-white/65 hover:text-white"
              }`}
              onClick={() => setBoardTab("tour")}
              role="tab"
              type="button"
            >
              <Trophy aria-hidden="true" size={12} />
              Tour total
            </button>
          </div>
        </div>

        <ol
          aria-label={
            boardTab === "leg" ? "Leg standings" : "Tour standings"
          }
          className="max-h-[36vh] space-y-2 overflow-y-auto overscroll-contain pr-1"
        >
          {activeList.map((player) => {
            const value =
              boardTab === "leg" ? (player.legScore ?? 0) : player.score;
            const rank =
              activeList.findIndex(
                (candidate) =>
                  (boardTab === "leg"
                    ? (candidate.legScore ?? 0)
                    : candidate.score) === value,
              ) + 1;
            const isSelf = player.id === selfPlayerId;
            const crowns = player.checkpointsWon ?? 0;

            return (
              <li
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
                  isSelf
                    ? "border-sky-400/45 bg-sky-400/10"
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
                      {crowns > 0 && (
                        <span
                          className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300"
                          title={`${crowns} leg ${crowns === 1 ? "win" : "wins"}`}
                        >
                          👑{crowns}
                        </span>
                      )}
                    </p>
                    {boardTab === "tour" && player.maxStreak >= 2 && (
                      <p className="text-[10px] font-bold uppercase text-white/50">
                        Best streak: 🔥{player.maxStreak}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-base font-black text-sky-200">
                  {value} <span className="text-[10px] text-white/45">pts</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
            React
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
                Host controls
              </h3>
              <p className="mt-1 text-xs text-white/55">
                {checkpointPaused
                  ? "Countdown paused — resume or jump straight into the next leg."
                  : "Next leg starts automatically when the countdown hits 0."}
              </p>
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  aria-busy={isAdvancingLeg}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!connected || isAdvancingLeg}
                  onClick={onStartNextLegNow}
                  type="button"
                >
                  {isAdvancingLeg ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 animate-spin"
                    />
                  ) : (
                    <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                  )}
                  <span>
                    {isAdvancingLeg
                      ? "Starting next leg…"
                      : "Start next leg now"}
                  </span>
                </button>
                <button
                  aria-pressed={checkpointPaused}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-40"
                  disabled={!connected}
                  onClick={onToggleCountdownPause}
                  type="button"
                >
                  {checkpointPaused ? (
                    <>
                      <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                      <span>Resume countdown</span>
                    </>
                  ) : (
                    <>
                      <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>Pause countdown</span>
                    </>
                  )}
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
                Checkpoint break
              </h3>
              <p className="mt-1 text-xs text-white/60">
                {checkpointPaused
                  ? `${adminName} paused the countdown.`
                  : `Leg ${nextLegNumber} starts in ${remainingSec}s…`}
              </p>
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

