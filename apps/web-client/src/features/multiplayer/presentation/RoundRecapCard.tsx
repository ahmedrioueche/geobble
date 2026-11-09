import type React from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomPlayer,
  type RoundResult,
} from "../contracts/multiplayerRoomProtocol";

interface RoundRecapCardProps {
  result: RoundResult;
  players: RoomPlayer[];
  selfPlayerId: string | null;
  answerName?: string;
  onSendReaction: (emoji: ReactionEmoji) => void;
}

const formatElapsedSeconds = (elapsedMs: number): string =>
  `${(elapsedMs / 1000).toFixed(1)}s`;

export const RoundRecapCard: React.FC<RoundRecapCardProps> = ({
  result,
  players,
  selfPlayerId,
  onSendReaction,
}) => {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const fastestPlayer = result.fastestPlayerId
    ? playerById.get(result.fastestPlayerId)
    : undefined;
  const fastestEntry = result.players.find(
    (entry) => entry.playerId === result.fastestPlayerId,
  );
  const closestPlayer =
    result.closestPinPlayerId != null
      ? playerById.get(result.closestPinPlayerId)
      : undefined;

  return (
    <div
      aria-label="Round recap"
      className="mt-3 space-y-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">
          Round recap
        </span>
        {fastestPlayer && fastestEntry && (
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
            ⚡ Fastest:{" "}
            {fastestPlayer.id === selfPlayerId ? "You" : fastestPlayer.name} (
            {formatElapsedSeconds(fastestEntry.elapsedMs)})
          </span>
        )}
      </div>

      {closestPlayer && typeof result.closestPinDistanceKm === "number" && (
        <p className="text-[11px] font-bold text-amber-200">
          📍 Closest pin:{" "}
          <span className="font-black">
            {closestPlayer.id === selfPlayerId ? "You" : closestPlayer.name}
          </span>{" "}
          ({result.closestPinDistanceKm} km)
        </p>
      )}

      {result.players.length > 0 && (
        <ul className="space-y-1">
          {result.players.map((entry) => {
            const player = playerById.get(entry.playerId);
            const displayName =
              entry.playerId === selfPlayerId
                ? "You"
                : (player?.name ?? "Player");
            return (
              <li
                className="flex items-center justify-between gap-2 text-[11px]"
                key={entry.playerId}
              >
                <span className="truncate font-bold text-white/85">
                  {entry.correct ? "✅" : "❌"} {displayName}
                  {entry.streakAfter >= 2 && (
                    <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                      🔥 {entry.streakAfter} in a row
                    </span>
                  )}
                </span>
                <span
                  className={`font-mono font-black ${entry.pointsGained > 0 ? "text-emerald-300" : "text-white/40"}`}
                >
                  +{entry.pointsGained}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-1 border-t border-white/10 pt-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
          React
        </span>
        <div className="flex items-center gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              aria-label={`React with ${emoji}`}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm transition hover:scale-110 hover:border-sky-300/40 hover:bg-sky-300/15"
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
  );
};

