import React, { useEffect } from "react";
import { Trophy, Target, Zap, ChevronRight, Home, Award, Timer } from "lucide-react";
import confetti from "canvas-confetti";
import BaseModal from "./BaseModal";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { formatDuration } from "../../utils/time";

const ResultModal: React.FC = () => {
  const { currentModal, resultProps, closeModal } = useModalStore();
  const { resetGame, startNewMission, setDifficultyStage } =
    useGameStore();

  if (currentModal !== "result" || !resultProps) return null;

  const {
    score = 0,
    accuracy = 0,
    streak = 0,
    correctAnswers = 0,
    isVictory = false,
    difficultyStage = 1,
    isWorldCompletion = false,
    timeElapsed = 0,
    totalLevels = 1,
  } = resultProps;

  const maxLevels = totalLevels;

  useEffect(() => {
    if (resultProps?.isVictory && resultProps?.difficultyStage === maxLevels) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 10000,
      };

      const randomInRange = (min: number, max: number) =>
        Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 40 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isVictory, difficultyStage]);

  if (currentModal !== "result" || !resultProps) return null;

  const handleRedeploy = () => {
    // 1. Advance difficulty if victory (up to what's unlocked)
    if (isVictory && difficultyStage < maxLevels) {
      const nextLevel = difficultyStage + 1;
      setDifficultyStage(nextLevel);
    }

    // 2. Clear status FIRST to avoid App.tsx re-triggering modal on reset
    startNewMission();

    // 3. Close modal last
    closeModal();
    window.dispatchEvent(new CustomEvent("game:start-mission"));
  };

  const handleMenu = () => {
    closeModal();
    resetGame();
  };

  const accuracyPct = Math.round(accuracy * 100);

  return (
    <BaseModal
      isOpen={true}
      onClose={handleMenu}
      closeOnOutsideClick={false}
      title="MISSION DEBRIEF"
      subtitle={`Level ${difficultyStage}/${maxLevels} Complete`}
      icon={Award}
      maxWidth="max-w-md"
      primaryButton={{
        label: isVictory
          ? difficultyStage === maxLevels
            ? "PLAY AGAIN"
            : "ADVANCE"
          : "RETRY",
        onClick: handleRedeploy,
        icon: ChevronRight,
        iconPosition: "right",
      }}
      secondaryButton={{
        label: "CANCEL",
        onClick: handleMenu,
        icon: Home,
      }}
    >
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Victory Status */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-2xl ${
            isVictory
              ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 shadow-emerald-500/20"
              : "bg-slate-700/50 text-slate-400 border-2 border-slate-600/50"
          }`}
        >
          {isVictory ? (
            <Trophy className="w-10 h-10" />
          ) : (
            <Award className="w-10 h-10" />
          )}
        </div>

        <div>
          <h2
            className={`text-2xl font-black tracking-tighter uppercase ${isVictory || isWorldCompletion ? "text-emerald-400" : "text-white"}`}
          >
            {isWorldCompletion
              ? "World Conquered"
              : isVictory
                ? "Mission Success"
                : "Mission Concluded"}
          </h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
            {isWorldCompletion
              ? "Legendary Navigator Status Achieved"
              : isVictory
                ? "New Difficulty Unlocked"
                : "Maintain 80% accuracy to advance"}
          </p>
        </div>

        {/* Major Score & Time */}
        <div className="flex gap-3 w-full">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 group hover:bg-white/10 transition-colors">
            <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
              Tactical Score
            </div>
            <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 group hover:bg-white/10 transition-colors">
            <div className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 justify-center">
              <Timer className="w-3 h-3" /> Time Taken
            </div>
            <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
              {formatDuration(timeElapsed || 0, 'ms')}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-1">
            <Target className="w-4 h-4 text-primary" />
            <div className="text-lg font-black text-white">{accuracyPct}%</div>
            <div className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
              Accuracy
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <div className="text-lg font-black text-white">{streak}</div>
            <div className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
              Max Streak
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <div className="text-lg font-black text-white">
              {correctAnswers}
            </div>
            <div className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
              {isWorldCompletion ? "Total Map" : "CORRECT ANSWERS"}
            </div>
          </div>
        </div>

        {isWorldCompletion && (
          <div className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-pulse">
            <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">
              🏆 ALL TERRITORIES CATALOGED 🏆
            </p>
            <p className="text-[10px] text-white/60 font-medium mt-1">
              You have successfully navigated the entire world map.
            </p>
          </div>
        )}

        {isVictory && difficultyStage === maxLevels && (
          <div className="w-full p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl animate-bounce">
            <p className="text-yellow-400 font-black text-xs uppercase tracking-widest">
              🏆 GEOBBLE MASTER STATUS ACHIEVED 🏆
            </p>
            <p className="text-[10px] text-white/60 font-medium mt-1">
              You have completed the final stage. The world is yours.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ResultModal;
