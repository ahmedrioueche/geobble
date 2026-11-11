import { useEffect, useState } from "react";
import type React from "react";
import type { RoomConfiguration } from "../contracts/multiplayerRoomProtocol";
import CustomSelect from "../../../components/atoms/CustomSelect";

interface RoomSettingsFormProps {
  initial: RoomConfiguration;
  submitting: boolean;
  onCancel: () => void;
  onSave: (configuration: RoomConfiguration) => Promise<void>;
}

export const RoomSettingsForm: React.FC<RoomSettingsFormProps> = ({
  initial,
  submitting,
  onCancel,
  onSave,
}) => {
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (!saveError) return;
    const timeout = window.setTimeout(() => setSaveError(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [saveError]);
  const update = (changes: Partial<RoomConfiguration>) =>
    setConfig((current) => ({ ...current, ...changes }));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setSaveError(null);
        setSaving(true);
        void onSave(config)
          .catch((error: unknown) => {
            setSaveError(
              error instanceof Error
                ? error.message
                : "Could not save room settings.",
            );
          })
          .finally(() => setSaving(false));
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        <CustomSelect<RoomConfiguration["mode"]>
        title="Mode"
        onChange={(mode) => update({ mode })}
        options={[
          { value: "identify", label: "Identify" },
          { value: "reverse", label: "Reverse" },
          { value: "pin", label: "Pin" },
        ]}
        selectedOption={config.mode}
      />

      {config.mode === "pin" && (
        <CustomSelect<RoomConfiguration["pinDirection"]>
          title="Pin mode"
          onChange={(pinDirection) => update({ pinDirection })}
          options={[
            { value: "locate", label: "Locate country" },
            { value: "identify", label: "Identify pin" },
          ]}
          selectedOption={config.pinDirection}
        />
      )}

      <CustomSelect<RoomConfiguration["subMode"]>
        title="Prompt"
        onChange={(subMode) => update({ subMode })}
        options={[
          { value: "name", label: "Country name" },
          { value: "flag", label: "Flag" },
          { value: "capital", label: "Capital" },
        ]}
        selectedOption={config.subMode}
      />

      <CustomSelect<NonNullable<RoomConfiguration["difficulty"]>>
        title="Difficulty"
        onChange={(difficulty) => update({ difficulty })}
        options={[
          { value: "progressive", label: "Progressive (Easy → Expert)" },
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
          { value: "expert", label: "Expert" },
        ]}
        selectedOption={config.difficulty ?? "progressive"}
      />

      <CustomSelect<RoomConfiguration["challengeType"]>
        title="Challenge"
        onChange={(challengeType) => {
          update({
            challengeType,
            challengeValue:
              challengeType === "world"
                ? 0
                : Math.max(1, config.challengeValue || 10),
          });
        }}
        options={[
          { value: "world", label: "Whole world" },
          { value: "count", label: "Target count" },
          { value: "timer", label: "Timed match" },
        ]}
        selectedOption={config.challengeType}
      />

      {config.challengeType !== "world" && (
        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
          {config.challengeType === "timer"
            ? config.endless === false
              ? "Duration (seconds)"
              : "Leg duration (seconds)"
            : config.endless === false
              ? "Rounds"
              : "Rounds per leg"}
          <input
            className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-slate-950 px-4 text-sm font-semibold text-white outline-none transition-colors hover:border-sky-300/50 hover:bg-slate-900 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20"
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

      <label className="flex items-center justify-between rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/80">
        <span>Endless tour (checkpoints)</span>
        <input
          checked={config.endless !== false}
          className="h-4 w-4 accent-sky-400"
          onChange={(event) => update({ endless: event.target.checked })}
          type="checkbox"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
          Round timer (s, 0 = off)
          <input
            className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition-colors hover:border-sky-300/50 hover:bg-slate-900 focus:border-sky-300"
            type="number"
            min={0}
            max={120}
            value={config.roundTimeLimitSeconds ?? 20}
            onChange={(event) =>
              update({
                roundTimeLimitSeconds: Math.max(
                  0,
                  Math.min(120, Math.trunc(Number(event.target.value) || 0)),
                ),
              })
            }
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
          Wrong penalty (pts)
          <input
            className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition-colors hover:border-sky-300/50 hover:bg-slate-900 focus:border-sky-300"
            type="number"
            min={0}
            max={100}
            value={config.wrongAnswerPenalty ?? 0}
            onChange={(event) =>
              update({
                wrongAnswerPenalty: Math.max(
                  0,
                  Math.min(100, Math.trunc(Number(event.target.value) || 0)),
                ),
              })
            }
          />
        </label>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/80">
        <span>Speed scoring bonus</span>
        <input
          checked={config.speedScoring !== false}
          className="h-4 w-4 accent-sky-400"
          onChange={(event) => update({ speedScoring: event.target.checked })}
          type="checkbox"
        />
      </label>

      {saveError && (
        <p className="text-sm text-rose-300" role="alert">
          {saveError}
        </p>
      )}
      </div>
      <div className="shrink-0 flex justify-end gap-3 border-t border-white/10 bg-slate-900 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:py-4">
        <button
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:text-white"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-sky-400 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
          disabled={submitting || saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
};
