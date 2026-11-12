import { useCallback, useState } from "react";
import type { CountryData } from "../../../../../data/country-data";
import { resolveMapCountry } from "../../../../game/domain/gameRules";
import type {
  PowerUpKind,
  ReactionEmoji,
  RoomSnapshot,
} from "../../../contracts/multiplayerRoomProtocol";
import type { useRoomClient } from "../../../application/useRoomClient";
import { triggerMultiplayerCue } from "../../multiplayerFeedback";

interface UseMultiplayerGameplayOptions {
  client: ReturnType<typeof useRoomClient>["client"];
  snapshot: RoomSnapshot | null | undefined;
  round: RoomSnapshot["game"]["round"] | null | undefined;
  self: RoomSnapshot["players"][number] | null | undefined;
  countries: CountryData[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  runAction: (action: () => Promise<void>) => Promise<void>;
  setActionError: (err: string | null) => void;
}

export function useMultiplayerGameplay({
  client,
  snapshot,
  round,
  self,
  countries,
  soundEnabled,
  hapticsEnabled,
  runAction,
  setActionError,
}: UseMultiplayerGameplayOptions) {
  const [localPinGuess, setLocalPinGuess] = useState<{
    missionId: string;
    location: [number, number];
  } | null>(null);
  const [pendingPause, setPendingPause] = useState<{
    target: boolean;
    revision: number;
  } | null>(null);

  const hasAnswered = self?.answered ?? false;
  const isSelfPaused = Boolean(self?.paused);
  const isRoomPaused = Boolean(snapshot?.game.paused);

  const isPinLocate =
    snapshot?.config.mode === "pin" &&
    snapshot.config.pinDirection === "locate";
  const isChoiceMode =
    snapshot?.config.mode === "reverse" ||
    (snapshot?.config.mode === "pin" &&
      snapshot.config.pinDirection === "identify");

  const togglePause = useCallback(
    (targetPaused = !isSelfPaused) => {
      if (snapshot?.status !== "playing") return;
      setPendingPause({ target: targetPaused, revision: snapshot.revision });
      void runAction(async () => {
        try {
          client.setPaused(targetPaused);
        } catch (error) {
          setPendingPause(null);
          throw error;
        }
      });
    },
    [client, isSelfPaused, runAction, snapshot],
  );

  const confirmSpectating = useCallback(() => {
    if (snapshot?.status !== "playing") return;
    void runAction(async () => {
      client.setPaused(true);
    });
  }, [client, runAction, snapshot?.status]);

  const usePowerUp = useCallback(
    (kind: PowerUpKind) => {
      if (
        !round ||
        round.revealed ||
        hasAnswered ||
        isSelfPaused ||
        isRoomPaused
      ) {
        return;
      }
      triggerMultiplayerCue("powerup", { soundEnabled, hapticsEnabled });
      void runAction(async () => {
        await client.submitCommand({ type: "powerup", kind });
      });
    },
    [
      client,
      hasAnswered,
      hapticsEnabled,
      isRoomPaused,
      isSelfPaused,
      round,
      runAction,
      soundEnabled,
    ],
  );

  const sendReaction = useCallback(
    (emoji: ReactionEmoji) => {
      client.sendReaction(emoji);
    },
    [client],
  );

  const submitMapAnswer = useCallback(
    (name: string, code: string, coordinates?: [number, number]) => {
      if (
        !snapshot ||
        snapshot.status !== "playing" ||
        !round ||
        hasAnswered ||
        isSelfPaused ||
        isRoomPaused
      ) {
        return;
      }
      if (snapshot.config.mode !== "identify" && !isPinLocate) return;
      const selectedCountry = resolveMapCountry(name, code, countries);
      if (isPinLocate) {
        if (!coordinates) {
          setActionError("Could not read the selected map location. Try again.");
          return;
        }
        setLocalPinGuess({ missionId: round.missionId, location: coordinates });
      }
      void runAction(async () => {
        await client.submitCommand({
          type: "answer",
          answerCountryCode: selectedCountry?.cca3 ?? null,
          ...(isPinLocate && coordinates ? { pinLocation: coordinates } : {}),
        });
      });
    },
    [
      client,
      countries,
      hasAnswered,
      isPinLocate,
      isRoomPaused,
      isSelfPaused,
      round,
      runAction,
      setActionError,
      snapshot,
    ],
  );

  const submitChoice = useCallback(
    (choiceId: string) => {
      if (
        !isChoiceMode ||
        !round ||
        hasAnswered ||
        isSelfPaused ||
        isRoomPaused
      ) {
        return;
      }
      void runAction(async () => {
        await client.submitCommand({
          type: "answer",
          answerCountryCode: null,
          choiceId,
        });
      });
    },
    [client, hasAnswered, isChoiceMode, isRoomPaused, isSelfPaused, round, runAction],
  );

  const isCorrectChoice = useCallback(
    (choice: { id: string; label: string; flagCode?: string }) => {
      if (!round?.answerReveal) return false;
      const revealCode = round.answerReveal.countryCode.trim().toLowerCase();
      const revealName = round.answerReveal.countryName.trim().toLowerCase();
      if (choice.flagCode) {
        const target = countries.find(
          (c) =>
            c.cca3.toLowerCase() === revealCode ||
            c.cca2.toLowerCase() === revealCode ||
            c.name.toLowerCase() === revealName,
        );
        if (target) {
          return choice.flagCode.toLowerCase() === target.cca2.toLowerCase();
        }
        return choice.flagCode.toLowerCase() === revealCode.slice(0, 2);
      }
      return choice.label.trim().toLowerCase() === revealName;
    },
    [countries, round],
  );

  return {
    localPinGuess,
    setLocalPinGuess,
    pendingPause,
    setPendingPause,
    hasAnswered,
    isSelfPaused,
    isRoomPaused,
    isPinLocate,
    isChoiceMode,
    togglePause,
    confirmSpectating,
    usePowerUp,
    sendReaction,
    submitMapAnswer,
    submitChoice,
    isCorrectChoice,
  };
}
