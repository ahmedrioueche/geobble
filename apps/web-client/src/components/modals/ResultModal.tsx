import React, { useEffect } from "react";
import { Award, ChevronRight, Home } from "lucide-react";
import confetti from "canvas-confetti";
import BaseModal from "./BaseModal";
import { ResultSummary } from "./ResultSummary";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { useMapUiStore } from "../../store/useMapUiStore";
import { useShallow } from "zustand/react/shallow";

const ResultModal: React.FC = () => {
  const { currentModal, resultProps, closeModal } = useModalStore(
    useShallow((state) => ({
      currentModal: state.currentModal,
      resultProps: state.resultProps,
      closeModal: state.closeModal,
    })),
  );
  const { resetGame, startNewMission, setDifficultyStage } = useGameStore(
    useShallow((state) => ({
      resetGame: state.resetGame,
      startNewMission: state.startNewMission,
      setDifficultyStage: state.setDifficultyStage,
    })),
  );
  const resetMapUi = useMapUiStore((state) => state.resetMapUi);

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
    challengeType = "world",
    challengeValue = 0,
  } = resultProps || {};

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

      const interval: ReturnType<typeof setInterval> = setInterval(() => {
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
  }, [isVictory, difficultyStage, maxLevels, resultProps]);

  if (currentModal !== "result" || !resultProps) return null;

  const handleRedeploy = () => {
    if (isVictory) {
      if (difficultyStage < maxLevels) {
        setDifficultyStage(difficultyStage + 1);
      } else {
        setDifficultyStage(1);
      }
    } else if (isWorldCompletion) {
      setDifficultyStage(1);
    }

    startNewMission();
    closeModal();
    window.dispatchEvent(new CustomEvent("game:start-mission"));
  };

  const handleMenu = () => {
    closeModal();
    resetGame();
    resetMapUi();
  };

  const accuracyPct = Math.round(accuracy * 100);
  const isFinalStage = difficultyStage === maxLevels;
  const isShowPlayAgain = (isVictory && isFinalStage) || isWorldCompletion;

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
        label: isShowPlayAgain
          ? "PLAY AGAIN"
          : isVictory
            ? "ADVANCE"
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
      <ResultSummary
        score={score}
        accuracyPct={accuracyPct}
        streak={streak}
        correctAnswers={correctAnswers}
        isVictory={isVictory}
        isWorldCompletion={isWorldCompletion}
        difficultyStage={difficultyStage}
        maxLevels={maxLevels}
        challengeType={challengeType}
        challengeValue={challengeValue}
        timeElapsed={timeElapsed}
      />
    </BaseModal>
  );
};

export default ResultModal;
