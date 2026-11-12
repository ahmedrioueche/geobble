import type { WorldMapGameState } from "../../../../map/worldMapStoreSelectors";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";

export interface LocalPinGuess {
  missionId: string;
  location: [number, number];
}

export function buildMultiplayerMapState(
  snapshot: RoomSnapshot | null | undefined,
  round: RoomSnapshot["game"]["round"] | null | undefined,
  selfPlayer: RoomSnapshot["players"][number] | null | undefined,
  localPinGuess: LocalPinGuess | null,
): WorldMapGameState {
  return {
    gameStatus:
      snapshot?.status === "playing"
        ? "playing"
        : snapshot?.status === "finished"
          ? "finished"
          : "idle",
    mode: snapshot?.config.mode ?? "identify",
    pinDirection: snapshot?.config.pinDirection ?? "locate",
    pinLocation:
      selfPlayer?.pinLocation ??
      (selfPlayer?.answered &&
      localPinGuess &&
      localPinGuess.missionId === round?.missionId
        ? localPinGuess.location
        : null),
    revealed: round?.revealed ?? false,
  };
}

export function resolveMultiplayerMapAnchor(
  snapshot: RoomSnapshot | null | undefined,
  round: RoomSnapshot["game"]["round"] | null | undefined,
) {
  const isReverse = snapshot?.config.mode === "reverse";
  const isPinIdentify =
    snapshot?.config.mode === "pin" &&
    snapshot.config.pinDirection === "identify";

  return isReverse || isPinIdentify ? round?.prompt.mapAnchor : undefined;
}

export function buildMultiplayerGameUi(lastAnswerResult: boolean | null) {
  return {
    feedback:
      lastAnswerResult === null
        ? null
        : lastAnswerResult
          ? ("correct" as const)
          : ("wrong" as const),
    clickedCode: null,
    clickedName: null,
  };
}
