import type React from "react";
import type {
  RoomConfiguration,
  RoomSnapshot,
} from "../../../contracts/multiplayerRoomProtocol";
import { RoomSettingsForm } from "../../RoomSettingsForm";

interface MultiplayerSettingsModalProps {
  snapshot: RoomSnapshot;
  isAdmin: boolean;
  hostCanProposeSettings: boolean;
  onClose: () => void;
  onSave: (config: RoomConfiguration) => Promise<void>;
  onPropose: (config: RoomConfiguration) => Promise<void>;
}

export const MultiplayerSettingsModal: React.FC<
  MultiplayerSettingsModalProps
> = ({
  snapshot,
  isAdmin,
  hostCanProposeSettings,
  onClose,
  onSave,
  onPropose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md md:items-center md:p-4">
      <div
        aria-labelledby="room-settings-modal-title"
        aria-modal="true"
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md md:rounded-2xl md:border md:border-white/10 md:shadow-2xl"
        role="dialog"
      >
        <div className="shrink-0 border-b border-white/10 px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-5">
          <h2
            className="text-lg font-black uppercase"
            id="room-settings-modal-title"
          >
            {!isAdmin
              ? "Propose settings vote"
              : snapshot.status === "playing"
                ? "Next round settings"
                : "Room settings"}
          </h2>
          {!isAdmin && (
            <p className="mt-1 text-xs text-white/60">
              {snapshot.status === "playing"
                ? "Applies on the next round if the room votes yes."
                : "Applies immediately if the room votes yes."}
            </p>
          )}
          {snapshot.pendingConfig && (
            <p className="mt-2 text-xs text-amber-200">
              {isAdmin
                ? "A settings change is already queued. Saving replaces it."
                : "A settings change is already queued. Passing a vote replaces it."}
            </p>
          )}
        </div>
        <RoomSettingsForm
          canPropose={hostCanProposeSettings}
          initial={snapshot.pendingConfig ?? snapshot.config}
          mode={isAdmin ? "edit" : "propose"}
          onCancel={onClose}
          onPropose={onPropose}
          onSave={onSave}
          submitting={false}
        />
      </div>
    </div>
  );
};
