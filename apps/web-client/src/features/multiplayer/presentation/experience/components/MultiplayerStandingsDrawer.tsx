import type React from "react";
import { X } from "lucide-react";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";
import type { StandingsScope } from "../hooks/useMultiplayerStandings";

interface MultiplayerStandingsDrawerProps {
  players: RoomSnapshot["players"];
  selfPlayerId: string | null;
  roundNumber: number;
  legNumber?: number;
  showStandings: boolean;
  onClose: () => void;
  standingsScope: StandingsScope;
  onScopeChange: (scope: StandingsScope) => void;
}

export const MultiplayerStandingsDrawer: React.FC<
  MultiplayerStandingsDrawerProps
> = ({
  players,
  selfPlayerId,
  roundNumber,
  legNumber,
  showStandings,
  onClose,
  standingsScope,
  onScopeChange,
}) => {
  const sortedPlayers = [...players].sort((first, second) =>
    standingsScope === "leg"
      ? (second.checkpointsWon ?? 0) - (first.checkpointsWon ?? 0) ||
        second.score - first.score
      : second.score - first.score,
  );

  return (
    <aside
      aria-label="Player standings"
      className={`${showStandings ? "block" : "hidden"} absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-10 max-h-[45vh] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6 md:z-20 md:block md:max-h-[50vh] md:w-80 md:bg-slate-950/90`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-widest text-sky-300">
          Standings · Round {roundNumber}
        </p>
        <div className="flex items-center gap-1.5">
          {legNumber !== undefined && (
            <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-[11px] font-black uppercase">
              <button
                className={`rounded-md px-2 py-1 transition ${
                  standingsScope === "tour"
                    ? "bg-sky-400 text-slate-950"
                    : "text-white/60 hover:text-white"
                }`}
                onClick={() => onScopeChange("tour")}
                type="button"
              >
                Tour
              </button>
              <button
                className={`rounded-md px-2 py-1 transition ${
                  standingsScope === "leg"
                    ? "bg-sky-400 text-slate-950"
                    : "text-white/60 hover:text-white"
                }`}
                onClick={() => onScopeChange("leg")}
                type="button"
              >
                Leg
              </button>
            </div>
          )}
          <button
            aria-label="Close players"
            className="-mr-1 -mt-1 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white md:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      <ul className="space-y-2.5">
        {sortedPlayers.map((player) => {
          const legWins = player.checkpointsWon ?? 0;
          return (
            <li
              className="flex items-center justify-between gap-3 text-sm"
              key={player.id}
            >
              <span
                className={`flex min-w-0 items-center gap-2 truncate font-bold ${
                  player.paused ? "text-rose-400" : ""
                }`}
              >
                <span
                  aria-label={
                    player.paused
                      ? `${player.name} AFK`
                      : player.lockedOut
                        ? `${player.name} locked out`
                        : player.answered
                          ? `${player.name} answered`
                          : `${player.name} thinking`
                  }
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full transition ${
                    player.paused
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]"
                      : player.lockedOut
                        ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
                        : player.answered
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                          : "bg-white/20"
                  }`}
                  title={
                    player.paused
                      ? "AFK / Unavailable for the moment"
                      : player.lockedOut
                        ? "Locked out this round"
                        : player.answered
                          ? "Locked in"
                          : "Thinking…"
                  }
                />
                <span className="truncate">
                  {player.name}
                  {player.id === selfPlayerId ? " (you)" : ""}
                </span>
                {player.paused && (
                  <span
                    className="shrink-0 rounded border border-rose-400/30 bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-black uppercase text-rose-300"
                    title="AFK / Unavailable for the moment"
                  >
                    AFK
                  </span>
                )}
                {legWins > 0 && (
                  <span
                    className="shrink-0 rounded bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-black text-amber-200"
                    title={`${legWins} leg wins`}
                  >
                    👑{legWins}
                  </span>
                )}
                {player.streak >= 2 && (
                  <span
                    className="shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-black text-amber-300"
                    title={`${player.streak} streak`}
                  >
                    🔥{player.streak}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm font-black text-sky-200">
                {standingsScope === "leg"
                  ? `${legWins} ${legWins === 1 ? "win" : "wins"}`
                  : player.score}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
