import {
  ChevronRight,
  Globe,
  GraduationCap,
  Hash,
  Lock,
  Timer,
} from "lucide-react";
import React, { useState } from "react";
import { useModalStore } from "../../store/modal";
import { useGameStore, type ChallengeType } from "../../store/useGameStore";
import BaseModal from "./BaseModal";

const STAGES = [
  {
    id: 1,
    name: "Explorer",
    description: "Most famous nations & large anchors",
  },
  {
    id: 2,
    name: "Navigator",
    description: "Regional powers & recognized states",
  },
  { id: 3, name: "Voyager", description: "Standard mid-sized countries" },
  {
    id: 4,
    name: "Cartographer",
    description: "Specialized regions & smaller territories",
  },
  {
    id: 5,
    name: "Globalist",
    description: "Obscure countries & autonomous regions",
  },
  {
    id: 6,
    name: "Conqueror",
    description: "Tiny island nations & remote dependencies",
  },
];

const COUNTS = [10, 20, 50, 100];
const TIMES = [
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

const SubModeModal: React.FC = () => {
  const { currentModal, subModeProps, closeModal } = useModalStore();
  const {
    setChallenge,
    setDifficultyStage,
    unlockedStage,
    challengeType,
    challengeValue,
  } = useGameStore();

  // Local state for modal before committing to store
  const [selectedType, setSelectedType] = useState<ChallengeType>(
    challengeType || "world",
  );
  const [selectedValue, setSelectedValue] = useState<number>(
    challengeValue || 10,
  );
  const [selectedStage, setSelectedStage] = useState<number>(
    unlockedStage || 1,
  );

  if (currentModal !== "sub-mode" || !subModeProps) return null;

  const handleStart = () => {
    setChallenge(selectedType, selectedValue);
    setDifficultyStage(selectedStage);

    // In a real implementation, we would call the game start logic here.
    // For now, we'll just close the modal.
    // The App.tsx will need to be updated to listen for the start trigger.
    closeModal();

    // Dispatch a custom event or call a prop to trigger the game start in App.tsx
    window.dispatchEvent(new CustomEvent("game:start-mission"));
  };

  const modeTitle =
    subModeProps.mode === "identify" ? "IDENTIFY MISSION" : "REVERSE OPS";

  return (
    <BaseModal
      isOpen={true}
      onClose={closeModal}
      title="MISSION PARAMETERS"
      subtitle={modeTitle}
      icon={GraduationCap}
      maxWidth="max-w-2xl"
      primaryButton={{
        label: "START",
        onClick: handleStart,
        icon: ChevronRight,
        iconPosition: "right",
      }}
    >
      <div className="space-y-8">
        {/* Challenge Type Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
            Select Challenge Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedType("world")}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                selectedType === "world"
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  : "border-white/5 bg-white/5 hover:border-white/20"
              }`}
            >
              <Globe
                className={`w-6 h-6 ${selectedType === "world" ? "text-primary" : "text-white/40"}`}
              />
              <div className="font-bold text-sm">ENTIRE WORLD</div>
              <div className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Conquer them all
              </div>
            </button>
            <button
              onClick={() => {
                setSelectedType("count");
                if (selectedValue === 0) setSelectedValue(10);
              }}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                selectedType === "count"
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  : "border-white/5 bg-white/5 hover:border-white/20"
              }`}
            >
              <Hash
                className={`w-6 h-6 ${selectedType === "count" ? "text-primary" : "text-white/40"}`}
              />
              <div className="font-bold text-sm">SET COUNT</div>
              <div className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Fixed targets
              </div>
            </button>
            <button
              onClick={() => {
                setSelectedType("timer");
                if (selectedValue === 0 || selectedValue > 300)
                  setSelectedValue(60);
              }}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                selectedType === "timer"
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  : "border-white/5 bg-white/5 hover:border-white/20"
              }`}
            >
              <Timer
                className={`w-6 h-6 ${selectedType === "timer" ? "text-primary" : "text-white/40"}`}
              />
              <div className="font-bold text-sm">TIME TRIAL</div>
              <div className="text-[10px] opacity-50 uppercase font-bold tracking-wider leading-tight">
                Beat the clock
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Values */}
        {selectedType === "count" && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
              Number of Countries
            </label>
            <div className="flex gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedValue(c)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                    selectedValue === c
                      ? "border-primary bg-primary text-white shadow-lg"
                      : "border-white/5 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {c}
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
              {TIMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedValue(t.value)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                    selectedValue === t.value
                      ? "border-primary bg-primary text-white shadow-lg"
                      : "border-white/5 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty Stages */}
        {selectedType !== "world" && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 block">
              Difficulty: {STAGES.find((s) => s.id === selectedStage)?.name}
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {STAGES.map((s) => {
                const isLocked = s.id > unlockedStage;
                const isSelected = selectedStage === s.id;

                return (
                  <button
                    key={s.id}
                    disabled={isLocked}
                    onClick={() => setSelectedStage(s.id)}
                    className={`relative h-12 rounded-xl border-2 transition-all group flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary/20"
                        : isLocked
                          ? "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-white/5 bg-white/5 hover:border-white/20"
                    }`}
                    title={
                      isLocked
                        ? "Complete previous missions to unlock"
                        : s.description
                    }
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-white/20" />
                    ) : (
                      <span
                        className={`font-black text-lg ${isSelected ? "text-primary" : "text-white/20"}`}
                      >
                        {s.id}
                      </span>
                    )}

                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
                    )}

                    {/* Tooltip-like name on hover */}
                    {!isLocked && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {s.name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-white/40 font-medium italic">
              &quot;{STAGES.find((s) => s.id === selectedStage)?.description}
              &quot;
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default SubModeModal;
