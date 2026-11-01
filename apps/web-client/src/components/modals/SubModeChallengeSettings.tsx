import { Globe, Hash, Lock, Timer } from "lucide-react";
import React from "react";
import type { ChallengeType } from "../../store/useGameStore";

const COUNTS = [10, 20, 30, 40, 50];
const TIMES = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

interface SubModeChallengeSettingsProps {
  selectedType: ChallengeType;
  selectedValue: number;
  selectedStage: number;
  maxLevels: number;
  unlockedStage: number;
  onTypeChange: (type: ChallengeType) => void;
  onValueChange: (value: number) => void;
  onStageChange: (stage: number) => void;
}

export const SubModeChallengeSettings: React.FC<
  SubModeChallengeSettingsProps
> = ({
  selectedType,
  selectedValue,
  selectedStage,
  maxLevels,
  unlockedStage,
  onTypeChange,
  onValueChange,
  onStageChange,
}) => {
  const selectCount = () => {
    onTypeChange("count");
    if (selectedValue === 0 || !COUNTS.includes(selectedValue)) {
      onValueChange(10);
    }
  };

  const selectTimer = () => {
    onTypeChange("timer");
    if (selectedValue === 0 || !TIMES.some((time) => time.value === selectedValue)) {
      onValueChange(60);
    }
  };

  return (
    <>
      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
          Select Challenge Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => onTypeChange("world")}
            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-start gap-3 ${
              selectedType === "world"
                ? "border-[var(--color-accent)] bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                : "border-white/5 bg-white/5 hover:border-white/20"
            }`}
          >
            <Globe
              className={`w-6 h-6 ${selectedType === "world" ? "text-[var(--color-accent)]" : "text-white/40"}`}
            />
            <span className="flex flex-1 flex-col gap-1 text-left">
              <span className="font-bold text-sm">ENTIRE WORLD</span>
              <span className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Conquer them all
              </span>
            </span>
          </button>
          <button
            onClick={selectCount}
            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-start gap-3 ${
              selectedType === "count"
                ? "border-[var(--color-accent)] bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                : "border-white/5 bg-white/5 hover:border-white/20"
            }`}
          >
            <Hash
              className={`w-6 h-6 ${selectedType === "count" ? "text-[var(--color-accent)]" : "text-white/40"}`}
            />
            <span className="flex flex-1 flex-col gap-1 text-left">
              <span className="font-bold text-sm">SET COUNT</span>
              <span className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Fixed targets
              </span>
            </span>
          </button>
          <button
            onClick={selectTimer}
            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-start gap-3 ${
              selectedType === "timer"
                ? "border-[var(--color-accent)] bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                : "border-white/5 bg-white/5 hover:border-white/20"
            }`}
          >
            <Timer
              className={`w-6 h-6 ${selectedType === "timer" ? "text-[var(--color-accent)]" : "text-white/40"}`}
            />
            <span className="flex flex-1 flex-col gap-1 text-left">
              <span className="font-bold text-sm">TIME TRIAL</span>
              <span className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Beat the clock
              </span>
            </span>
          </button>
        </div>
      </div>

      {selectedType === "count" && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
            Number of Countries
          </label>
          <div className="flex gap-2">
            {COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => onValueChange(count)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                  selectedValue === count
                    ? "border-[var(--color-accent)] bg-primary text-white shadow-lg"
                    : "border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedType === "timer" && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
            Session Duration
          </label>
          <div className="flex gap-2">
            {TIMES.map((time) => (
              <button
                key={time.value}
                onClick={() => onValueChange(time.value)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                  selectedValue === time.value
                    ? "border-[var(--color-accent)] bg-primary text-white shadow-lg"
                    : "border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedType !== "world" && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
            Selection: Tier {selectedStage}
          </label>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
            {Array.from({ length: maxLevels }, (_, index) => index + 1).map(
              (stage) => {
                const isLocked = stage > unlockedStage;
                const isSelected = selectedStage === stage;

                return (
                  <button
                    key={stage}
                    disabled={isLocked}
                    onClick={() => onStageChange(stage)}
                    className={`relative h-10 md:h-12 rounded-xl border-2 transition-all group flex items-center justify-center ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-primary/20"
                        : isLocked
                          ? "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-white/5 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-3 h-3 text-white/20" />
                    ) : (
                      <span
                        className={`font-black text-sm md:text-lg ${isSelected ? "text-primary" : "text-white/20"}`}
                      >
                        {stage}
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
                    )}
                  </button>
                );
              },
            )}
          </div>
          <p className="mt-4 text-xs text-white/40 font-medium italic">
            {selectedType === "count"
              ? `Progress through the world in sets of ${selectedValue} targets each.`
              : "Race against the clock across different difficulty tiers."}
          </p>
        </div>
      )}
    </>
  );
};
