import { useState } from "react";
import type React from "react";
import type {
  RoomConfiguration,
} from "../contracts/multiplayerRoomProtocol";

interface RoomSettingsFormProps {
  initial: RoomConfiguration;
  submitting: boolean;
  onCancel: () => void;
  onSave: (configuration: RoomConfiguration) => void;
}

export const RoomSettingsForm: React.FC<RoomSettingsFormProps> = ({
  initial,
  submitting,
  onCancel,
  onSave,
}) => {
  const [config, setConfig] = useState(initial);
  const update = (changes: Partial<RoomConfiguration>) =>
    setConfig((current) => ({ ...current, ...changes }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(config);
      }}
    >
      <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
        Mode
        <select
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white"
          value={config.mode}
          onChange={(event) =>
            update({ mode: event.target.value as RoomConfiguration["mode"] })
          }
        >
          <option value="identify">Identify</option>
          <option value="reverse">Reverse</option>
          <option value="pin">Pin</option>
        </select>
      </label>

      {config.mode === "pin" && (
        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
          Pin mode
          <select
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white"
            value={config.pinDirection}
            onChange={(event) =>
              update({
                pinDirection:
                  event.target.value as RoomConfiguration["pinDirection"],
              })
            }
          >
            <option value="locate">Locate country</option>
            <option value="identify">Identify pin</option>
          </select>
        </label>
      )}

      <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
        Prompt
        <select
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white"
          value={config.subMode}
          onChange={(event) =>
            update({ subMode: event.target.value as RoomConfiguration["subMode"] })
          }
        >
          <option value="name">Country name</option>
          <option value="flag">Flag</option>
          <option value="capital">Capital</option>
        </select>
      </label>

      <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
        Challenge
        <select
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white"
          value={config.challengeType}
          onChange={(event) => {
            const challengeType =
              event.target.value as RoomConfiguration["challengeType"];
            update({
              challengeType,
              challengeValue:
                challengeType === "world"
                  ? 0
                  : Math.max(1, config.challengeValue || 10),
            });
          }}
        >
          <option value="world">Whole world</option>
          <option value="count">Target count</option>
          <option value="timer">Timed match</option>
        </select>
      </label>

      {config.challengeType !== "world" && (
        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
          {config.challengeType === "timer" ? "Duration (seconds)" : "Rounds"}
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-white"
            type="number"
            min={1}
            max={500}
            value={config.challengeValue}
            onChange={(event) =>
              update({
                challengeValue: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:text-white"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-sky-400 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          Save settings
        </button>
      </div>
    </form>
  );
};
