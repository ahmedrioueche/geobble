import { Award, Target, Timer, Trophy, Zap } from "lucide-react";
import React from "react";
import { formatDuration } from "../../utils/time";

interface ResultSummaryProps {
  score: number;
  accuracyPct: number;
  streak: number;
  correctAnswers: number;
  isVictory: boolean;
  isWorldCompletion: boolean;
  difficultyStage: number;
  maxLevels: number;
  challengeType: string;
  challengeValue: number;
  timeElapsed: number;
}

export const ResultSummary: React.FC<ResultSummaryProps> = ({
  score,
  accuracyPct,
  streak,
  correctAnswers,
  isVictory,
  isWorldCompletion,
  difficultyStage,
  maxLevels,
  challengeType,
  challengeValue,
  timeElapsed,
}) => (
  <div className="flex flex-col items-center text-center space-y-6">
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
          ? "Mission Master"
          : isVictory
            ? "Mission Success"
            : "Mission Concluded"}
      </h2>
      <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
        {isWorldCompletion
          ? "Legendary Navigator Status Achieved"
          : isVictory
            ? "Tactical Objectives Secured"
            : "Maintain 80% accuracy to advance"}
      </p>
    </div>

    <div className="flex gap-3 w-full">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 group hover:bg-white/10 transition-colors">
        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
          Tactical Score
        </div>
        <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
          {(score || 0).toLocaleString()}
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 group hover:bg-white/10 transition-colors">
        <div className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 justify-center">
          <Timer className="w-3 h-3" />{" "}
          {challengeType === "timer" ? "Session Duration" : "Time Taken"}
        </div>
        <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
          {challengeType === "timer"
            ? formatDuration(challengeValue || 60, "s")
            : formatDuration(timeElapsed || 0, "ms")}
        </div>
      </div>
    </div>

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
        <div className="text-lg font-black text-white">{correctAnswers}</div>
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
);
