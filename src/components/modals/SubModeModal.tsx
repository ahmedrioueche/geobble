import { ChevronRight, GraduationCap } from "lucide-react";
import React, { useState } from "react";
import { getMaxLevels } from "../../data/difficulty-ranking";
import { useModalStore } from "../../store/modal";
import {
  useGameStore,
  type ChallengeType,
  type PinDirection,
} from "../../store/useGameStore";
import BaseModal from "./BaseModal";
import { SubModeChallengeSettings } from "./SubModeChallengeSettings";
import { SubModeModeSettings } from "./SubModeModeSettings";

const SubModeModal: React.FC = () => {
  const { currentModal, subModeProps, closeModal } = useModalStore();
  const {
    setChallenge,
    mode,
    setMode,
    subMode,
    setSubMode,
    pinDirection,
    setPinDirection,
    setDifficultyStage,
    unlockedStage,
    challengeType,
    challengeValue,
  } = useGameStore();

  const [selectedType, setSelectedType] = useState<ChallengeType>(
    challengeType || "world",
  );
  const [selectedValue, setSelectedValue] = useState<number>(
    challengeValue || 10,
  );
  const [selectedStage, setSelectedStage] = useState<number>(
    unlockedStage || 1,
  );
  const maxLevels =
    selectedType === "world" ? 1 : getMaxLevels(selectedValue);

  if (selectedStage > maxLevels && selectedType !== "world") {
    setSelectedStage(maxLevels);
  }

  if (currentModal !== "sub-mode" || !subModeProps) return null;

  const selectedDirection: PinDirection =
    mode === "pin"
      ? pinDirection
      : mode === "reverse"
        ? "identify"
        : "locate";
  const modeTitle = subModeProps.modeGroup === "pin" ? "PIN DROP" : "COUNTRY MODE";

  const handleDirectionChange = (direction: PinDirection) => {
    if (subModeProps.modeGroup === "pin") {
      setMode("pin");
      setPinDirection(direction);
    } else {
      setMode(direction === "locate" ? "identify" : "reverse");
    }
  };

  const handleStart = () => {
    setChallenge(selectedType, selectedValue);
    const direction =
      mode === "pin"
        ? pinDirection
        : mode === "reverse"
          ? "identify"
          : "locate";
    setMode(
      subModeProps.modeGroup === "pin"
        ? "pin"
        : direction === "locate"
          ? "identify"
          : "reverse",
    );
    if (subModeProps.modeGroup === "pin") setPinDirection(direction);
    setDifficultyStage(selectedStage);
    closeModal();
    window.dispatchEvent(new CustomEvent("game:start-mission"));
  };

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
        <SubModeModeSettings
          modeGroup={subModeProps.modeGroup}
          subMode={subMode}
          selectedDirection={selectedDirection}
          onSubModeChange={setSubMode}
          onDirectionChange={handleDirectionChange}
        />
        <SubModeChallengeSettings
          selectedType={selectedType}
          selectedValue={selectedValue}
          selectedStage={selectedStage}
          maxLevels={maxLevels}
          unlockedStage={unlockedStage}
          onTypeChange={setSelectedType}
          onValueChange={setSelectedValue}
          onStageChange={setSelectedStage}
        />
      </div>
    </BaseModal>
  );
};

export default SubModeModal;
