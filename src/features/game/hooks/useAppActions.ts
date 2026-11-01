import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../../../store/useGameStore";
import { useGameLogic } from "../useGameLogic";
import { shouldAdvanceRound } from "../gameRules";
import { useAnswerSelection } from "./useAnswerSelection";
import { useRoundControls } from "./useRoundControls";
import {
  createTimeoutController,
  executeRoundEffects,
} from "../roundActionExecutor";
import { useGameUiStore } from "../../../store/useGameUiStore";
import type { GameCommandInput } from "../gameProtocol";
import { handleGameCommand } from "../gameCommandHandler";
import {
  systemGameClock,
  type GameClock,
} from "../../../store/gameClock";
import { useShallow } from "zustand/react/shallow";

interface UseAppActionsOptions {
  clock?: GameClock;
  seed?: number;
}

export const useAppActions = ({
  clock = systemGameClock,
  seed,
}: UseAppActionsOptions = {}) => {
  const clockRef = useRef(clock);
  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);
  const readNow = useCallback(() => clockRef.current(), []);
  const {
    gameStatus,
    mode,
    pinDirection,
    choices,
    missionId,
    revealed,
    pendingAdvanceAt,
  } = useGameStore(
    useShallow((state) => ({
      gameStatus: state.session.gameStatus,
      mode: state.session.mode,
      pinDirection: state.session.pinDirection,
      choices: state.session.choices,
      missionId: state.session.missionId,
      revealed: state.session.revealed,
      pendingAdvanceAt: state.session.pendingAdvanceAt,
    })),
  );
  const feedback = useGameUiStore((state) => state.feedback);
  const {
    setRevealed,
    startNewMission,
    setPendingAdvanceAt,
  } = useGameStore(
    useShallow((state) => ({
      setRevealed: state.setRevealed,
      startNewMission: state.startNewMission,
      setPendingAdvanceAt: state.setPendingAdvanceAt,
    })),
  );

  const {
    countries,
    loading,
    nextQuestion,
    currentCountry,
    startGame,
  } = useGameLogic(readNow);

  const roundAdvanceTimerRef = useRef<
    ReturnType<typeof createTimeoutController> | null
  >(null);
  const scheduledAdvanceAtRef = useRef<number | null>(null);
  if (roundAdvanceTimerRef.current === null) {
    roundAdvanceTimerRef.current = createTimeoutController();
  }

  const clearRoundAdvanceTimer = useCallback(() => {
    roundAdvanceTimerRef.current?.clear();
    scheduledAdvanceAtRef.current = null;
    if (useGameStore.getState().session.pendingAdvanceAt !== null) {
      setPendingAdvanceAt(null);
    }
  }, [setPendingAdvanceAt]);

  const scheduleAdvanceAt = useCallback(
    (timestamp: number) => {
      if (scheduledAdvanceAtRef.current === timestamp) return;
      roundAdvanceTimerRef.current?.clear();
      scheduledAdvanceAtRef.current = timestamp;
      roundAdvanceTimerRef.current?.schedule(
        Math.max(0, timestamp - readNow()),
        () => {
          scheduledAdvanceAtRef.current = null;
          setPendingAdvanceAt(null);
          const freshState = useGameStore.getState();
          if (
            shouldAdvanceRound(
              freshState.session.challengeType,
              freshState.session.challengeValue,
              freshState.session.totalAttempts,
            )
          ) {
            nextQuestion();
          }
        },
      );
    },
    [nextQuestion, readNow, setPendingAdvanceAt],
  );

  useEffect(() => {
    if (gameStatus !== "playing" || pendingAdvanceAt === null) {
      roundAdvanceTimerRef.current?.clear();
      scheduledAdvanceAtRef.current = null;
      return;
    }

    scheduleAdvanceAt(pendingAdvanceAt);
    return () => {
      if (scheduledAdvanceAtRef.current === pendingAdvanceAt) {
        roundAdvanceTimerRef.current?.clear();
        scheduledAdvanceAtRef.current = null;
      }
    };
  }, [gameStatus, pendingAdvanceAt, scheduleAdvanceAt]);

  const scheduleAdvance = useCallback(
    (delayMs: number) => {
      const timestamp = readNow() + delayMs;
      setPendingAdvanceAt(timestamp);
      scheduleAdvanceAt(timestamp);
    },
    [readNow, scheduleAdvanceAt, setPendingAdvanceAt],
  );

  useEffect(() => {
    return () => {
      roundAdvanceTimerRef.current?.clear();
      scheduledAdvanceAtRef.current = null;
    };
  }, []);

  const playAudio = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.4; // Tactile, not overwhelming
    audio.play().catch(() => {}); // Ignore silent playback blocks
  }, []);

  const applyGameCommand = useCallback(
    (
      commandInput: GameCommandInput,
      clickedName: string,
      clickedCode: string | null = null,
    ) => {
      const currentState = useGameStore.getState();
      const currentUiState = useGameUiStore.getState();
      if (!currentState.session.id || !currentState.session.missionId) return;

      const command = {
        ...commandInput,
        sessionId: currentState.session.id,
        commandId: currentState.session.lastCommandId + 1,
        missionId: currentState.session.missionId,
      };
      const result = handleGameCommand(
        command,
        {
          session: currentState.session,
          ui: currentUiState,
        },
        { clickedName, clickedCode },
      );
      if (!result.accepted) return;

      useGameStore.setState({ session: result.session });
      useGameUiStore.setState(result.ui);
      executeRoundEffects(result.effects, {
        playFeedback: (feedbackType) =>
          playAudio(
            feedbackType === "correct"
              ? "/audio/correct.mp3"
              : "/audio/wrong.mp3",
          ),
        clearAdvanceTimer: clearRoundAdvanceTimer,
        scheduleAdvance,
        nextQuestion,
      });
    },
    [
      clearRoundAdvanceTimer,
      nextQuestion,
      playAudio,
      scheduleAdvance,
    ],
  );

  const {
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
  } = useAnswerSelection({
    countries,
    currentCountry,
    gameStatus,
    mode,
    pinDirection,
    feedback,
    applyGameCommand,
  });

  const { start, skip, reveal } = useRoundControls({
    currentCountry,
    clearAdvanceTimer: clearRoundAdvanceTimer,
    applyGameCommand,
    nextQuestion,
    clearClickedCountry: () => setClickedCountry(null),
    startNewMission: () =>
      startNewMission({
        now: readNow(),
        ...(seed === undefined ? {} : { seed }),
      }),
    startGame,
  });

  return {
    clock: readNow,
    clickedCountry,
    setClickedCountry,
    handleCountryClick,
    handleChoiceSelect,
    handleFinalStart: start,
    gameStatus,
    mode,
    choices,
    feedback,
    missionId,
    revealed,
    setRevealed,
    handleReveal: reveal,
    skipQuestion: skip,
    nextQuestion,
    currentCountry,
    countries,
    loading,
  };
};
