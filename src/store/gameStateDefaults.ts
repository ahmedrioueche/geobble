import {
  createInitialGameSession,
  type GameSessionState,
} from "../features/game/domain/gameSession";

export { createInitialGameSession };

export interface GameStateData {
  session: GameSessionState;
  unlockedStage: number;
}

export const createInitialGameState = (
  unlockedStage = 1,
): GameStateData => ({
  session: createInitialGameSession(),
  unlockedStage,
});
