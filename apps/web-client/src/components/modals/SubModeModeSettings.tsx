import { Crosshair, Flag, Landmark, MapPin, Type } from "lucide-react";
import React from "react";
import type { GameModeGroup } from "../../types/modal";
import type { PinDirection, SubMode } from "../../store/useGameStore";

interface SubModeModeSettingsProps {
  modeGroup: GameModeGroup;
  subMode: SubMode;
  selectedDirection: PinDirection;
  onSubModeChange: (mode: SubMode) => void;
  onDirectionChange: (direction: PinDirection) => void;
}

export const SubModeModeSettings: React.FC<SubModeModeSettingsProps> = ({
  modeGroup,
  subMode,
  selectedDirection,
  onSubModeChange,
  onDirectionChange,
}) => {
  const promptModes = [
    { id: "name" as const, label: "COUNTRY NAME", icon: Type },
    { id: "flag" as const, label: "FLAG", icon: Flag },
    { id: "capital" as const, label: "CAPITAL", icon: Landmark },
  ];
  const directions =
    modeGroup === "pin"
      ? [
          {
            id: "locate" as const,
            label: "LOCATE",
            description: "Drop inside the named country",
            icon: MapPin,
          },
          {
            id: "identify" as const,
            label: "IDENTIFY",
            description: "Name the country under the pin",
            icon: Crosshair,
          },
        ]
      : [
          {
            id: "locate" as const,
            label: "LOCATE",
            description: "Find the prompted country on the map",
            icon: MapPin,
          },
          {
            id: "identify" as const,
            label: "IDENTIFY",
            description: "Choose the country highlighted on the map",
            icon: Crosshair,
          },
        ];

  return (
    <>
      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
          Starting Prompt
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {promptModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onSubModeChange(id)}
              aria-pressed={subMode === id}
              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-start text-left gap-3 ${
                subMode === id
                  ? "border-[var(--color-accent)] bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  : "border-white/5 bg-white/5 hover:border-white/20"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${subMode === id ? "text-[var(--color-accent)]" : "text-white/40"}`}
              />
              <span className="flex-1 font-bold text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
          Select Direction
        </label>
        <div className="grid grid-cols-2 gap-3">
          {directions.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onDirectionChange(id)}
              aria-pressed={selectedDirection === id}
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                selectedDirection === id
                  ? "border-[var(--color-accent)] bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  : "border-white/5 bg-white/5 hover:border-white/20"
              }`}
            >
              <Icon
                className={`w-6 h-6 ${selectedDirection === id ? "text-[var(--color-accent)]" : "text-white/40"}`}
              />
              <span className="flex flex-1 flex-col gap-1 text-left">
                <span className="font-bold text-sm">{label}</span>
                <span className="text-[10px] opacity-60 uppercase font-bold tracking-wider leading-tight">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
