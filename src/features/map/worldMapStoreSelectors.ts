import type { GameSessionState, GameUiState } from "../../store/gameSession";

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
