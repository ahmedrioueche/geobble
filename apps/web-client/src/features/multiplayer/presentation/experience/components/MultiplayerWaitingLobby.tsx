import type React from "react";
import { Loader2 } from "lucide-react";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";
import { RoomInviteCard } from "../../RoomShareControls";
import {
  RoomQuickSettingsBar,
  RoomSettingsPanel,
} from "../../RoomSettingsPanel";
import { StartingGameOverlay } from "../../StartingGameOverlay";

interface MultiplayerWaitingLobbyProps {
  snapshot: RoomSnapshot;
  roomSecret?: string;
  selfPlayerId: string | null;
  isAdmin: boolean;
  connectedPlayersCount: number;
  isStartingGame: boolean;
  canProposeSettings: boolean;
  hasActiveVote: boolean;
  isConnected: boolean;
  onStartGame: () => void;
  onOpenSettings: () => void;
  onCopyRoomCode: () => void;
}

export const MultiplayerWaitingLobby: React.FC<
  MultiplayerWaitingLobbyProps
> = ({
  snapshot,
  roomSecret,
  selfPlayerId,
  isAdmin,
  connectedPlayersCount,
  isStartingGame,
  canProposeSettings,
  hasActiveVote,
  isConnected,
  onStartGame,
  onOpenSettings,
  onCopyRoomCode,
}) => {
  return (
    <div
      aria-label="Waiting room"
      className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto overflow-x-hidden bg-slate-950/95 backdrop-blur-xl md:inset-x-4 md:bottom-5 md:top-24 md:bg-transparent md:backdrop-blur-none"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-0 md:gap-4 md:p-0">
        <div className="md:hidden">
          <RoomQuickSettingsBar
            canPropose={canProposeSettings}
            config={snapshot.config}
            hasActiveVote={hasActiveVote}
            isAdmin={isAdmin}
            onOpenSettings={onOpenSettings}
            pendingConfig={snapshot.pendingConfig}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:grid md:min-h-0 md:grid-cols-[1fr_1.2fr] md:gap-4">
          <div className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-xl md:bg-slate-950/90 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black uppercase tracking-wider">Players</h2>
              <span className="text-xs text-white/50">
                {snapshot.players.length} players
              </span>
            </div>
            <ul
              aria-label="Room players"
              className="max-h-[40vh] space-y-2 overflow-y-auto overscroll-contain pr-1"
            >
              {snapshot.players.map((player) => (
                <li
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-3 sm:px-4"
                  key={player.id}
                >
                  <span className="min-w-0 truncate font-bold">
                    {player.name}
                    {player.isAdmin && (
                      <span className="ml-2 text-[10px] font-black uppercase text-sky-300">
                        Admin
                      </span>
                    )}
                    {player.id === selfPlayerId && (
                      <span className="ml-2 text-[10px] uppercase text-white/40">
                        You
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-bold ${player.connected ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {player.connected ? "Connected" : "Disconnected"}
                  </span>
                </li>
              ))}
            </ul>
            {isAdmin ? (
              <div className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
                <p className="text-sm font-bold text-white">
                  {connectedPlayersCount >= 2
                    ? "Match can start whenever you want."
                    : "Waiting for another player to join."}
                </p>
                <div className="sticky bottom-0 mt-4 bg-slate-950/95 py-1">
                  <button
                    aria-busy={isStartingGame}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      !isConnected ||
                      isStartingGame ||
                      connectedPlayersCount < 2
                    }
                    onClick={onStartGame}
                    type="button"
                  >
                    {isStartingGame && (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 animate-spin"
                      />
                    )}
                    <span>
                      {isStartingGame ? "Starting game…" : "Start game"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-bold text-white">
                  Waiting for the host to start
                </p>
                <div
                  aria-label="Waiting for the host to start"
                  className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                >
                  <div className="waiting-line-loader h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400/40 via-sky-300 to-sky-400/40" />
                </div>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3 md:gap-4">
            <RoomSettingsPanel
              canPropose={canProposeSettings}
              config={snapshot.config}
              hasActiveVote={hasActiveVote}
              isAdmin={isAdmin}
              onEdit={onOpenSettings}
              onPropose={onOpenSettings}
              pendingConfig={snapshot.pendingConfig}
            />
            <RoomInviteCard
              onCopyCode={onCopyRoomCode}
              roomId={snapshot.roomId}
              roomSecret={roomSecret}
              visibility={snapshot.visibility}
            />
          </div>
        </div>
      </div>
      {isStartingGame && (
        <StartingGameOverlay
          modeLabel={snapshot.config.mode}
          playerCount={snapshot.players.length}
        />
      )}
    </div>
  );
};
