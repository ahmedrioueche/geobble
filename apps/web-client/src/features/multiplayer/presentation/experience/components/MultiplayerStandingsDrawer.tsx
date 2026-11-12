import React, { useRef, useState } from "react";
import { Users, X } from "lucide-react";
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
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const selfRowRef = useRef<HTMLLIElement>(null);

  const sortedPlayers = [...players].sort((first, second) =>
    standingsScope === "leg"
      ? (second.checkpointsWon ?? 0) - (first.checkpointsWon ?? 0) ||
        second.score - first.score
      : second.score - first.score,
  );

  const selfIndex = sortedPlayers.findIndex(
    (player) => player.id === selfPlayerId,
  );
  const selfPlayer = selfIndex !== -1 ? sortedPlayers[selfIndex] : null;
  // If the player is ranked below the visible top 5, show a pinned row at the top
  const isSelfBelowFold = selfIndex >= 5;

  return (
    <>
      {/* On desktop when collapsed: single icon on the bottom left of the screen */}
      {isDesktopCollapsed && (
        <button
          aria-expanded={false}
          aria-label="Open players"
          className="hidden md:flex absolute bottom-6 left-6 z-20 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-3 text-white shadow-2xl backdrop-blur-xl transition hover:border-sky-400/50 hover:bg-slate-900 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 group"
          onClick={() => setIsDesktopCollapsed(false)}
          title="Show players and standings"
          type="button"
        >
          <Users
            aria-hidden="true"
            className="transition-transform group-hover:scale-110"
            size={20}
          />
          <span className="font-mono text-xs font-black text-sky-300">
            {players.length}
          </span>
        </button>
      )}

      {/* Players Standings Card */}
      <aside
        aria-label="Player standings"
        className={`${showStandings ? "block" : "hidden"} ${
          isDesktopCollapsed ? "md:hidden" : "md:block"
        } absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-10 h-auto max-h-[50vh] w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-6 md:z-20 md:max-h-[60vh] md:w-80 lg:w-96 md:bg-slate-950/90 flex flex-col`}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-sky-300">
              Standings · Round {roundNumber}
            </p>
            <span className="text-[10px] font-bold text-white/50">
              {players.length} {players.length === 1 ? "player" : "players"}
            </span>
          </div>
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
              className="-mr-1 -mt-1 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                onClose();
                setIsDesktopCollapsed(true);
              }}
              title="Close or collapse to icon"
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        </div>

        {/* Pinned "Your Rank" Row: only visible when the player is pushed below the top visible ranks */}
        {isSelfBelowFold && selfPlayer && (
          <button
            aria-label={`Jump to your position #${selfIndex + 1}`}
            className="mb-2.5 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-2.5 py-2 text-left text-sm transition hover:bg-sky-400/15 group"
            onClick={() => {
              selfRowRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
            title="Click to jump to your position in the list"
            type="button"
          >
            <span
              className={`flex min-w-0 items-center gap-2 truncate font-bold ${
                selfPlayer.paused ? "text-rose-400" : ""
              }`}
            >
              <span className="shrink-0 rounded bg-sky-400/25 px-1.5 py-0.5 text-[10px] font-mono font-black text-sky-200">
                You #{selfIndex + 1}
              </span>
              <span
                aria-label={
                  selfPlayer.paused
                    ? `${selfPlayer.name} AFK`
                    : selfPlayer.lockedOut
                      ? `${selfPlayer.name} locked out`
                      : selfPlayer.answered
                        ? `${selfPlayer.name} answered`
                        : `${selfPlayer.name} thinking`
                }
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full transition ${
                  selfPlayer.paused
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]"
                    : selfPlayer.lockedOut
                      ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
                      : selfPlayer.answered
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                        : "bg-white/20"
                }`}
                title={
                  selfPlayer.paused
                    ? "AFK / Unavailable for the moment"
                    : selfPlayer.lockedOut
                      ? "Locked out this round"
                      : selfPlayer.answered
                        ? "Locked in"
                        : "Thinking…"
                }
              />
              <span className="truncate text-white">
                {selfPlayer.name}
              </span>
              {selfPlayer.paused && (
                <span
                  className="shrink-0 rounded border border-rose-400/30 bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-black uppercase text-rose-300"
                  title="AFK / Unavailable for the moment"
                >
                  AFK
                </span>
              )}
              {(selfPlayer.checkpointsWon ?? 0) > 0 && (
                <span
                  className="shrink-0 rounded bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-black text-amber-200"
                  title={`${selfPlayer.checkpointsWon} leg wins`}
                >
                  👑{selfPlayer.checkpointsWon}
                </span>
              )}
              {selfPlayer.streak >= 2 && (
                <span
                  className="shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-black text-amber-300"
                  title={`${selfPlayer.streak} streak`}
                >
                  🔥{selfPlayer.streak}
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono text-sm font-black text-sky-300">
              {standingsScope === "leg"
                ? `${selfPlayer.checkpointsWon ?? 0} ${(selfPlayer.checkpointsWon ?? 0) === 1 ? "win" : "wins"}`
                : selfPlayer.score}
            </span>
          </button>
        )}

        <ul
          aria-label={
            standingsScope === "leg" ? "Leg standings" : "Tour standings"
          }
          className="flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
        >
          {sortedPlayers.map((player, index) => {
            const legWins = player.checkpointsWon ?? 0;
            return (
              <li
                className={`flex items-center justify-between gap-3 text-sm py-1 transition-colors ${
                  player.id === selfPlayerId
                    ? "rounded-lg bg-white/5 px-2 -mx-1"
                    : ""
                }`}
                key={player.id}
                ref={player.id === selfPlayerId ? selfRowRef : undefined}
              >
                <span
                  className={`flex min-w-0 items-center gap-2 truncate font-bold ${
                    player.paused ? "text-rose-400" : ""
                  }`}
                >
                  <span className="shrink-0 w-4 text-[11px] font-mono font-bold text-white/40">
                    #{index + 1}
                  </span>
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
    </>
  );
};
