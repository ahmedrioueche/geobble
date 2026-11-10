import type React from "react";
import type { RoomConfiguration } from "../contracts/multiplayerRoomProtocol";

interface RoomSettingsPanelProps {
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  isAdmin: boolean;
  onEdit: () => void;
}

const getSettings = (config: RoomConfiguration) => [
  {
    label: "Mode",
    value:
      config.mode === "pin"
        ? `Pin · ${config.pinDirection === "locate" ? "Locate country" : "Identify pin"}`
        : config.mode === "reverse"
          ? "Reverse"
          : "Identify",
  },
  {
    label: "Prompt",
    value:
      config.subMode === "flag"
        ? "Flag"
        : config.subMode === "capital"
          ? "Capital"
          : "Country name",
  },
  {
    label: "Difficulty",
    value:
      !config.difficulty || config.difficulty === "progressive"
        ? "Progressive"
        : config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1),
  },
  {
    label: "Challenge",
    value:
      config.challengeType === "world"
        ? "Whole world"
        : config.challengeType === "count"
          ? `${config.challengeValue} rounds`
          : `${config.challengeValue} seconds`,
  },
  {
    label: "Round timer",
    value:
      (config.roundTimeLimitSeconds ?? 20) === 0
        ? "Off"
        : `${config.roundTimeLimitSeconds ?? 20}s`,
  },
  {
    label: "Scoring",
    value: [
      config.speedScoring === false ? "Flat" : "Speed bonus",
      (config.wrongAnswerPenalty ?? 0) > 0
        ? `-${config.wrongAnswerPenalty} on wrong`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  },
];

const SettingsList: React.FC<{ config: RoomConfiguration }> = ({ config }) => (
  <dl className="mt-5 space-y-4">
    {getSettings(config).map(({ label, value }) => (
      <div
        className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0"
        key={label}
      >
        <dt className="text-xs font-bold uppercase tracking-wider text-white/45">
          {label}
        </dt>
        <dd className="text-right text-sm font-bold text-white">{value}</dd>
      </div>
    ))}
  </dl>
);

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  config,
  pendingConfig,
  isAdmin,
  onEdit,
}) => (
  <section
    aria-label="Room settings"
    className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-left backdrop-blur-xl"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight">
          Game settings
        </h2>
        <p className="mt-1 text-xs text-white/45">
          Visible to everyone in this room
        </p>
      </div>
      {isAdmin && (
        <button
          className="rounded-lg border border-sky-300/30 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-300/10"
          onClick={onEdit}
          type="button"
        >
          Edit
        </button>
      )}
    </div>

    <SettingsList config={config} />
    {pendingConfig && (
      <div className="mt-5 border-t border-amber-200/20 pt-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">
          Next round settings
        </p>
        <SettingsList config={pendingConfig} />
      </div>
    )}
  </section>
);
