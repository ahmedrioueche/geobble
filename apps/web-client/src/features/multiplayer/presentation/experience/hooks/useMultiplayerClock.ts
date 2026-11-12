import { useEffect, useState } from "react";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";
import { triggerMultiplayerCue } from "../../multiplayerFeedback";

interface UseMultiplayerClockOptions {
  snapshot: RoomSnapshot | null | undefined;
  round: RoomSnapshot["game"]["round"] | null | undefined;
  self: RoomSnapshot["players"][number] | null | undefined;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  lastTickSecondRef: React.MutableRefObject<number | null>;
}

export function useMultiplayerClock({
  snapshot,
  round,
  self,
  soundEnabled,
  hapticsEnabled,
  lastTickSecondRef,
}: UseMultiplayerClockOptions) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (
      snapshot?.status !== "playing" &&
      snapshot?.status !== "checkpoint" &&
      !snapshot?.settingsVote
    ) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [
    snapshot?.status,
    snapshot?.settingsVote,
    snapshot?.game.timerDeadlineAt,
    snapshot?.game.checkpointResumeAt,
  ]);

  const remainingTime =
    snapshot?.game.timerDeadlineAt === null ||
    snapshot?.game.timerDeadlineAt === undefined
      ? null
      : Math.max(
          0,
          snapshot.game.timerDeadlineAt -
            (now === 0 ? snapshot.game.timerDeadlineAt : now),
        );

  const roundRemainingMs =
    round?.deadlineAt != null
      ? Math.max(
          0,
          round.deadlineAt -
            (now === 0 ? (round.startedAt ?? round.deadlineAt) : now),
        )
      : 0;

  const pauseRemainingMs =
    snapshot?.game.pauseDeadlineAt != null
      ? Math.max(
          0,
          snapshot.game.pauseDeadlineAt -
            (now === 0 ? snapshot.game.pauseDeadlineAt : now),
        )
      : null;

  const checkpointRemainingMs =
    snapshot?.game.checkpointResumeAt != null
      ? Math.max(
          0,
          snapshot.game.checkpointResumeAt -
            (now === 0 ? snapshot.game.checkpointResumeAt - 10_000 : now),
        )
      : 0;

  const spectatorPromptRemainingMs =
    self?.paused && self.spectatorPromptDeadlineAt != null
      ? Math.max(
          0,
          self.spectatorPromptDeadlineAt -
            (now === 0 ? self.spectatorPromptDeadlineAt - 30_000 : now),
        )
      : null;

  useEffect(() => {
    if (!round || round.revealed || round.deadlineAt == null) return;
    const remainingSec = Math.ceil(roundRemainingMs / 1000);
    if (
      remainingSec >= 1 &&
      remainingSec <= 5 &&
      lastTickSecondRef.current !== remainingSec
    ) {
      lastTickSecondRef.current = remainingSec;
      triggerMultiplayerCue("tick", { soundEnabled, hapticsEnabled });
    }
  }, [round, roundRemainingMs, soundEnabled, hapticsEnabled, lastTickSecondRef]);

  return {
    now,
    remainingTime,
    roundRemainingMs,
    pauseRemainingMs,
    checkpointRemainingMs,
    spectatorPromptRemainingMs,
  };
}
