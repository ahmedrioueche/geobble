import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type {
  RoomReactionEvent,
  RoomSnapshot,
} from "../../../contracts/multiplayerRoomProtocol";
import type { useRoomClient } from "../../../application/useRoomClient";
import { getRoomSettingsDiff } from "../../roomSettingsDiff";
import {
  readHapticsEnabled,
  readSoundEnabled,
  triggerMultiplayerCue,
  writeHapticsEnabled,
  writeSoundEnabled,
} from "../../multiplayerFeedback";

export interface FloatingReaction extends RoomReactionEvent {
  id: string;
  leftPercent: number;
}

interface UseMultiplayerFeedbackOptions {
  snapshot: RoomSnapshot | null | undefined;
  selfPlayerId: string | null;
  lastAnswerResult: boolean | null;
  lastReaction: RoomReactionEvent | null;
  lastVoteResolved: ReturnType<typeof useRoomClient>["state"]["lastVoteResolved"];
}

export function useMultiplayerFeedback({
  snapshot,
  selfPlayerId,
  lastAnswerResult,
  lastReaction,
  lastVoteResolved,
}: UseMultiplayerFeedbackOptions) {
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(readHapticsEnabled);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>(
    [],
  );

  const previousRoomSnapshot = useRef<RoomSnapshot | null>(null);
  const lastResolvedVoteIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const reactionTimersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    writeSoundEnabled(soundEnabled);
    writeHapticsEnabled(hapticsEnabled);
  }, [soundEnabled, hapticsEnabled]);

  useEffect(() => {
    if (lastAnswerResult === null) return;
    triggerMultiplayerCue(lastAnswerResult ? "correct" : "wrong", {
      soundEnabled,
      hapticsEnabled,
    });
  }, [lastAnswerResult, soundEnabled, hapticsEnabled]);

  useEffect(() => {
    const timers = reactionTimersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!lastReaction) return;
    const reaction = lastReaction;
    const id = `${reaction.playerId}-${reaction.timestamp}`;
    const leftPercent = 25 + (((reaction.timestamp % 50) + 50) % 50);
    const addTimer = window.setTimeout(() => {
      reactionTimersRef.current.delete(addTimer);
      setFloatingReactions((current) => [
        ...current.slice(-11),
        { ...reaction, id, leftPercent },
      ]);
      const removeTimer = window.setTimeout(() => {
        reactionTimersRef.current.delete(removeTimer);
        setFloatingReactions((current) =>
          current.filter((item) => item.id !== id),
        );
      }, 2400);
      reactionTimersRef.current.add(removeTimer);
    }, 0);
    reactionTimersRef.current.add(addTimer);
  }, [lastReaction]);

  useEffect(() => {
    if (!lastVoteResolved) {
      lastResolvedVoteIdRef.current = null;
      return;
    }
    if (lastResolvedVoteIdRef.current === lastVoteResolved.voteId) return;
    lastResolvedVoteIdRef.current = lastVoteResolved.voteId;

    if (lastVoteResolved.outcome === "passed") {
      toast.success(
        lastVoteResolved.queued
          ? "Vote passed — new settings apply next round"
          : "Vote passed — settings updated",
        { icon: "✅" },
      );
    } else if (lastVoteResolved.outcome === "rejected") {
      toast("Settings proposal did not pass", { icon: "🗳️" });
    } else if (lastVoteResolved.outcome === "expired") {
      toast("Settings vote timed out", { icon: "⏱️" });
    } else if (lastVoteResolved.outcome === "superseded") {
      toast("Host updated room settings directly", { icon: "⚙️" });
    } else if (lastVoteResolved.outcome === "cancelled") {
      toast("Settings vote cancelled", { icon: "⚠️" });
    }
  }, [lastVoteResolved]);

  useEffect(() => {
    if (!snapshot) {
      previousRoomSnapshot.current = null;
      return;
    }

    const previous = previousRoomSnapshot.current;
    previousRoomSnapshot.current = snapshot;
    if (!previous || previous.roomId !== snapshot.roomId) return;

    if (
      snapshot.settingsVote &&
      snapshot.settingsVote.voteId !== previous.settingsVote?.voteId &&
      snapshot.settingsVote.proposerPlayerId !== selfPlayerId
    ) {
      const vote = snapshot.settingsVote;
      const diffs = getRoomSettingsDiff(
        snapshot.pendingConfig ?? snapshot.config,
        vote.proposedConfig,
      );
      const summary =
        diffs.length > 0
          ? diffs.map((diff) => `${diff.label}: ${diff.to}`).join(" · ")
          : "room settings";
      toast(
        <span>
          <span className="font-black text-sky-300">{vote.proposerName}</span>{" "}
          wants to change {summary}
        </span>,
        { icon: "🗳️" },
      );
      triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
    }

    for (const player of snapshot.players) {
      if (player.id === selfPlayerId) continue;
      const previousPlayer = previous.players.find(
        (candidate) => candidate.id === player.id,
      );
      if (!previousPlayer && player.connected) {
        toast.success(
          <span>
            <span className="font-black text-emerald-400">{player.name}</span>{" "}
            joined the room
          </span>,
          { icon: "👋" },
        );
        triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
      } else if (
        previousPlayer &&
        !previousPlayer.connected &&
        player.connected
      ) {
        toast.success(
          <span>
            <span className="font-black text-sky-400">{player.name}</span>{" "}
            reconnected to the room
          </span>,
          { icon: "🔌" },
        );
        triggerMultiplayerCue("player-join", { soundEnabled, hapticsEnabled });
      } else if (previousPlayer?.connected && !player.connected) {
        toast(
          <span>
            <span className="font-black text-amber-400">{player.name}</span>{" "}
            disconnected
          </span>,
          { icon: "⚠️" },
        );
        triggerMultiplayerCue("player-leave", { soundEnabled, hapticsEnabled });
      } else if (
        previousPlayer &&
        Boolean(previousPlayer.paused) !== Boolean(player.paused)
      ) {
        if (player.paused) {
          toast(
            <span>
              <span className="font-black text-rose-400">{player.name}</span>{" "}
              is AFK for the moment
            </span>,
            { icon: "⏸" },
          );
        } else {
          toast.success(
            <span>
              <span className="font-black text-emerald-400">{player.name}</span>{" "}
              is back
            </span>,
            { icon: "▶️" },
          );
        }
      }
    }

    for (const previousPlayer of previous.players) {
      if (previousPlayer.id === selfPlayerId) continue;
      const stillPresent = snapshot.players.some(
        (candidate) => candidate.id === previousPlayer.id,
      );
      if (!stillPresent) {
        toast(
          <span>
            <span className="font-black text-rose-400">
              {previousPlayer.name}
            </span>{" "}
            left the room
          </span>,
          { icon: "🚪" },
        );
        triggerMultiplayerCue("player-leave", { soundEnabled, hapticsEnabled });
      }
    }

    const previousRound = previous.game.round;
    const currentRound = snapshot.game.round;
    if (
      currentRound &&
      (!previousRound || previousRound.missionId !== currentRound.missionId)
    ) {
      lastTickSecondRef.current = null;
      triggerMultiplayerCue("round-start", { soundEnabled, hapticsEnabled });
    }
    if (
      previousRound &&
      currentRound &&
      previousRound.missionId === currentRound.missionId &&
      !previousRound.revealed &&
      currentRound.revealed &&
      currentRound.answerReveal
    ) {
      const answerName = currentRound.answerReveal.countryName;
      const scorers = snapshot.players.filter((player) => {
        const previousPlayer = previous.players.find(
          (candidate) => candidate.id === player.id,
        );
        return (
          previousPlayer !== undefined && player.score > previousPlayer.score
        );
      });
      if (scorers.length > 0) {
        const names = scorers.map((player) =>
          player.id === selfPlayerId ? "You" : player.name,
        );
        const maxStreak = Math.max(...scorers.map((player) => player.streak));
        const promptValue = currentRound.prompt.value.trim().toLowerCase();
        const answerIsObvious =
          currentRound.prompt.type === "text" &&
          promptValue === answerName.trim().toLowerCase();
        toast.success(
          <span>
            <span className="font-black text-sky-500">
              {names.join(", ")}
            </span>{" "}
            got it!
            {!answerIsObvious && (
              <>
                {" "}
                The answer is{" "}
                <span className="font-black text-emerald-600">
                  {answerName}
                </span>
                .
              </>
            )}
            {maxStreak >= 2 && (
              <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                🔥 {maxStreak} in a row!
              </span>
            )}
          </span>,
          { icon: "🎯" },
        );
      }
    }
  }, [snapshot, selfPlayerId, soundEnabled, hapticsEnabled]);

  return {
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    floatingReactions,
    lastTickSecondRef,
  };
}
