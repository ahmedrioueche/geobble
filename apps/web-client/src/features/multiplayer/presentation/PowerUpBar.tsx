import type React from "react";
import type {
  PlayerPowerUps,
  PowerUpKind,
} from "../contracts/multiplayerRoomProtocol";

interface PowerUpBarProps {
  powerUps: PlayerPowerUps;
  isChoiceMode: boolean;
  hasRoundTimer: boolean;
  doubleActive: boolean;
  disabled: boolean;
  onUsePowerUp: (kind: PowerUpKind) => void;
}

const POWER_UP_ITEMS: ReadonlyArray<{
  kind: PowerUpKind;
  label: string;
  icon: string;
  title: string;
}> = [
  {
    kind: "fifty",
    label: "50/50",
    icon: "✂️",
    title: "Remove two wrong choices (once per match)",
  },
  {
    kind: "hint",
    label: "Hint",
    icon: "💡",
    title: "Reveal a clue tailored to this round (once per match)",
  },
  {
    kind: "double",
    label: "2× Pts",
    icon: "⚡",
    title: "Double points on this round if correct (once per match)",
  },
  {
    kind: "freeze",
    label: "+8s",
    icon: "❄️",
    title: "Extend the round timer by 8 seconds (once per match)",
  },
];

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  powerUps,
  isChoiceMode,
  hasRoundTimer,
  doubleActive,
  disabled,
  onUsePowerUp,
}) => (
  <div
    aria-label="Power-ups"
    className="mt-2.5 grid grid-cols-4 gap-1.5"
  >
    {POWER_UP_ITEMS.map(({ kind, label, icon, title }) => {
      const available = powerUps[kind];
      const modeSupported =
        (kind !== "fifty" || isChoiceMode) &&
        (kind !== "freeze" || hasRoundTimer);
      const isDoubleActive = kind === "double" && doubleActive;

      return (
        <button
          aria-label={label}
          className={`flex flex-row items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-black uppercase transition ${
            isDoubleActive
              ? "border-amber-300/70 bg-amber-300/20 text-amber-200"
              : available && modeSupported
                ? "border-white/15 bg-white/5 text-white/85 hover:border-sky-300/50 hover:bg-sky-300/10"
                : "border-white/5 bg-white/[0.02] text-white/25 opacity-45"
          }`}
          disabled={disabled || !available || !modeSupported}
          key={kind}
          onClick={() => onUsePowerUp(kind)}
          title={title}
          type="button"
        >
          <span aria-hidden="true" className="text-xs leading-none">
            {icon}
          </span>
          <span className="leading-tight">{label}</span>
        </button>
      );
    })}
  </div>
);

