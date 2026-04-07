export type GameMode = "identify" | "reverse";

export type GameSubMode = "entire-world" | "set-count" | "timer";

export interface SubModeModalProps {
  mode: GameMode;
}

export interface ConfirmModalProps {
  text?: string;
  title?: string;
  confirmText?: string;
  confirmVariant?: "danger" | "success" | "primary";
  onConfirm?: () => void;
  onCancel?: () => void;
  verificationText?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    variant?: "danger" | "success" | "primary" | "default";
  };
}
export interface ResultModalProps {
  score: number;
  accuracy: number;
  streak: number;
  correctAnswers: number;
  totalQuestions: number;
  isVictory: boolean;
  difficultyStage: number;
  challengeType?: string;
  challengeValue?: number;
  isWorldCompletion?: boolean;
  timeElapsed?: number;
}
