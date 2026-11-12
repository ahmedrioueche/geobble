import type React from "react";
import {
  Loader2,
  LogOut,
  Pause,
  Play,
  SlidersHorizontal,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";
import { RoomHeaderShareControls } from "../../RoomShareControls";

interface MultiplayerHeaderProps {
  snapshot: RoomSnapshot;
  roomSecret?: string;
  connectionStatus: string;
  reconnectRequired: boolean;
  onRetryReconnect: () => void;
  onCopyRoomCode: () => void;
  showStandings: boolean;
  onToggleStandings: () => void;
  isSelfPaused: boolean;
  isUpdatingPause: boolean;
  onTogglePause: () => void;
  isAdmin: boolean;
  canProposeSettings: boolean;
  hasActiveVote: boolean;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLeave: () => void;
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  snapshot,
  roomSecret,
  connectionStatus,
  reconnectRequired,
  onRetryReconnect,
  onCopyRoomCode,
  showStandings,
  onToggleStandings,
  isSelfPaused,
  isUpdatingPause,
  onTogglePause,
  isAdmin,
  canProposeSettings,
  hasActiveVote,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  onLeave,
}) => {
  const isConnected = connectionStatus === "connected";

  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur-xl md:min-h-16 md:flex-wrap md:gap-3 md:px-7 md:py-3">
      <RoomHeaderShareControls
        onCopyCode={onCopyRoomCode}
        roomId={snapshot.roomId}
        roomSecret={roomSecret}
        visibility={snapshot.visibility}
      />
      <div className="flex items-center gap-2 md:gap-3">
        {!isConnected && (
          <span className="text-[10px] font-bold uppercase text-amber-300 md:text-xs">
            {connectionStatus}
          </span>
        )}
        {reconnectRequired && connectionStatus === "error" && (
          <button
            className="text-[10px] font-black uppercase text-sky-300 underline"
            onClick={onRetryReconnect}
            type="button"
          >
            Retry
          </button>
        )}
        {snapshot.status === "playing" && (
          <button
            aria-expanded={showStandings}
            aria-label="Toggle players"
            className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 md:hidden"
            onClick={onToggleStandings}
            type="button"
          >
            <Users aria-hidden="true" size={14} />
            {snapshot.players.filter((player) => player.answered).length}/
            {snapshot.players.length}
          </button>
        )}
        {snapshot.status === "playing" && (
          <button
            aria-busy={isUpdatingPause}
            aria-label={isSelfPaused ? "Resume game" : "Pause game"}
            aria-pressed={isSelfPaused}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-50 md:px-3 md:py-2 md:text-xs ${
              isSelfPaused
                ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
                : "border-white/15 text-white/80 hover:bg-white/10"
            }`}
            disabled={!isConnected || isUpdatingPause}
            onClick={onTogglePause}
            type="button"
          >
            {isUpdatingPause ? (
              <Loader2
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin"
              />
            ) : isSelfPaused ? (
              <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isUpdatingPause
                ? isSelfPaused
                  ? "Resuming…"
                  : "Pausing…"
                : isSelfPaused
                  ? "Resume"
                  : "Pause"}
            </span>
          </button>
        )}
        {(isAdmin || canProposeSettings) && snapshot.status !== "waiting" && (
          <button
            aria-label={
              isAdmin
                ? "Change settings"
                : hasActiveVote
                  ? "Settings vote active"
                  : "Propose settings change"
            }
            className="flex items-center gap-1 rounded-lg border border-white/15 p-1.5 text-[10px] font-black uppercase text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 md:px-3 md:py-2 md:text-xs"
            disabled={!isConnected || (!isAdmin && hasActiveVote)}
            onClick={onOpenSettings}
            title={
              isAdmin
                ? "Change settings"
                : hasActiveVote
                  ? "Settings vote already active"
                  : "Propose settings change"
            }
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={14} />
            <span className="hidden md:inline">
              {isAdmin
                ? "Settings"
                : hasActiveVote
                  ? "Vote"
                  : "Propose"}
            </span>
          </button>
        )}
        <button
          aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          aria-pressed={soundEnabled}
          className="rounded-lg border border-white/15 p-1.5 text-white/75 hover:bg-white/10 hover:text-white md:p-2"
          onClick={onToggleSound}
          title={soundEnabled ? "Sound on" : "Sound muted"}
          type="button"
        >
          {soundEnabled ? (
            <Volume2 aria-hidden="true" size={14} />
          ) : (
            <VolumeX aria-hidden="true" size={14} />
          )}
        </button>
        <button
          aria-label="Leave"
          className="flex items-center gap-1 rounded-lg border border-white/15 p-1.5 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 disabled:opacity-50 md:px-3 md:py-2 md:text-xs"
          disabled={!isConnected}
          onClick={onLeave}
          title="Leave room"
          type="button"
        >
          <LogOut aria-hidden="true" size={14} />
          <span className="hidden md:inline">Leave</span>
        </button>
      </div>
    </header>
  );
};
