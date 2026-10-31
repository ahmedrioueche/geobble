import React from "react";
import { StatItem } from "../../../components/molecules/StatItem";
import type { SubMode } from "../../../store/useGameStore";

interface SubModeSelectorProps {
  subMode: SubMode;
  onSelect: (mode: SubMode) => void;
  compact?: boolean;
}

export const SubModeSelector: React.FC<SubModeSelectorProps> = ({
  subMode,
  onSelect,
  compact = false,
}) => {
  const modes: SubMode[] = ["name", "flag", "capital"];

  return (
    <div
      className={`flex bg-slate-900/80 p-1 rounded-xl border border-white/15 ${compact ? "gap-1" : ""}`}
    >
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          className={
            compact
              ? `px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 ${
                  subMode === mode
                    ? "bg-white text-slate-950 shadow-lg font-black"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`
              : `px-3 lg:px-5 py-1 rounded-lg text-[9px] lg:text-[10px] font-bold uppercase transition-all duration-200 ${
                  subMode === mode
                    ? "bg-white text-slate-950 shadow-lg font-black"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`
          }
        >
          {compact ? mode[0] : mode}
        </button>
      ))}
    </div>
  );
};

interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
  mobileOnly?: boolean;
}

export const FullscreenToggle: React.FC<FullscreenToggleProps> = ({
  isFullscreen,
  onToggle,
  mobileOnly = false,
}) => (
  <button
    onClick={onToggle}
    className={
      mobileOnly
        ? "flex sm:hidden w-8 h-8 rounded-lg bg-white/5 items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
        : "flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
    }
    aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isFullscreen ? (
        <>
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </>
      )}
    </svg>
  </button>
);

interface HudStatsProps {
  progressLabel: string;
  progressValue: string;
  displayTime: string;
  isTimerMode: boolean;
  timeRemaining: number;
  difficultyStage: number;
  totalLevels: number;
  score: number;
  accuracy: number;
  streak: number;
}

const HudStats: React.FC<HudStatsProps> = ({
  progressLabel,
  progressValue,
  displayTime,
  isTimerMode,
  timeRemaining,
  difficultyStage,
  totalLevels,
  score,
  accuracy,
  streak,
}) => (
  <>
    <div className="hidden md:block">
      <StatItem
        label={progressLabel}
        value={progressValue}
        color="var(--color-primary)"
        size="sm"
      />
    </div>
    <div className="hidden md:block">
      <StatItem
        label="TIME"
        value={displayTime}
        color={isTimerMode && timeRemaining < 10 ? "#ef4444" : "white"}
        size="sm"
      />
    </div>
    <StatItem
      label="LEVEL"
      value={`${difficultyStage}/${totalLevels || 1}`}
      color="var(--color-primary)"
      size="sm"
    />
    <StatItem label="SCORE" value={score.toLocaleString()} color="white" size="sm" />
    <div className="hidden sm:block">
      <StatItem
        label="ACCURACY"
        value={accuracy}
        suffix="%"
        color="var(--color-accent)"
        size="sm"
      />
    </div>
    <StatItem
      label="STREAK"
      value={streak}
      suffix="×"
      color="var(--color-streak)"
      size="sm"
    />
  </>
);

export const DesktopHudStats: React.FC<HudStatsProps> = (props) => (
  <div className="flex gap-3 md:gap-8 items-center">
    <HudStats {...props} />
  </div>
);

interface MobileHudStatsProps extends HudStatsProps {
  subMode: SubMode;
  onSubModeChange: (mode: SubMode) => void;
}

export const MobileHudStats: React.FC<MobileHudStatsProps> = ({
  progressLabel,
  progressValue,
  displayTime,
  isTimerMode,
  timeRemaining,
  accuracy,
  subMode,
  onSubModeChange,
}) => (
  <div className="flex flex-col gap-2 px-4 pb-3 md:hidden">
    <div className="flex justify-between items-center border-t border-white/5 pt-2">
      <div className="flex gap-4">
        <StatItem
          label={progressLabel}
          value={progressValue}
          color="var(--color-primary)"
          size="sm"
        />
        <StatItem
          label="ACCURACY"
          value={accuracy}
          suffix="%"
          color="var(--color-accent)"
          size="sm"
        />
        <StatItem
          label="TIME"
          value={displayTime}
          color={isTimerMode && timeRemaining < 10 ? "#ef4444" : "white"}
          size="sm"
        />
      </div>
      <SubModeSelector
        subMode={subMode}
        onSelect={onSubModeChange}
        compact
      />
    </div>
  </div>
);
