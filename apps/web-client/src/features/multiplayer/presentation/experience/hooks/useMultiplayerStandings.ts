import { useMemo, useState } from "react";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";

export type StandingsScope = "tour" | "leg";

export function useMultiplayerStandings(
  players: RoomSnapshot["players"] | undefined,
) {
  const [showStandings, setShowStandings] = useState(false);
  const [standingsScope, setStandingsScope] = useState<StandingsScope>("tour");

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((first, second) =>
      standingsScope === "leg"
        ? (second.checkpointsWon ?? 0) - (first.checkpointsWon ?? 0) ||
          second.score - first.score
        : second.score - first.score,
    );
  }, [players, standingsScope]);

  return {
    showStandings,
    setShowStandings,
    standingsScope,
    setStandingsScope,
    sortedPlayers,
  };
}
