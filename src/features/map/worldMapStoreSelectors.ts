import type { GameSessionState, GameUiState } from "../../store/gameSession";
import type { MapUiState } from "../../store/useMapUiStore";

type WorldMapSessionSource = {
  session: Pick<
    GameSessionState,
    "gameStatus" | "mode" | "pinDirection" | "pinLocation" | "revealed"
  >;
};

type WorldMapUiSource = Pick<
  GameUiState,
  "feedback" | "clickedCode" | "clickedName"
>;

export const selectWorldMapSession = ({
  session,
}: WorldMapSessionSource) => ({
  gameStatus: session.gameStatus,
  mode: session.mode,
  pinDirection: session.pinDirection,
  pinLocation: session.pinLocation,
  revealed: session.revealed,
});

export const selectWorldMapUi = ({
  feedback,
  clickedCode,
  clickedName,
}: WorldMapUiSource) => ({
  feedback,
  clickedCode,
  clickedName,
});

type WorldMapMapUiSource = Pick<
  MapUiState,
  "pulseKey" | "sonarKey" | "tempHighlightCode"
>;

export const selectWorldMapMapUi = ({
  pulseKey,
  sonarKey,
  tempHighlightCode,
}: WorldMapMapUiSource) => ({
  pulseKey,
  sonarKey,
  tempHighlightCode,
});

export type WorldMapGameState = ReturnType<typeof selectWorldMapSession>;
export type WorldMapGameUiState = ReturnType<typeof selectWorldMapUi>;
export type WorldMapMapUiState = ReturnType<typeof selectWorldMapMapUi>;
