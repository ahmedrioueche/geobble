import {
  GAME_SESSION_STORAGE_KEY,
  type GameSessionSnapshot,
} from "./gameSessionSnapshot";

export interface GameSessionRepository {
  load(): Promise<unknown | null>;
  save(snapshot: GameSessionSnapshot): Promise<void>;
  remove(): Promise<void>;
}

export class LocalGameSessionRepository implements GameSessionRepository {
  private readonly getStorage: () => Storage;

  constructor(getStorage: () => Storage = () => window.localStorage) {
    this.getStorage = getStorage;
  }

  async load(): Promise<unknown | null> {
    try {
      const savedValue = this.getStorage().getItem(GAME_SESSION_STORAGE_KEY);
      return savedValue === null ? null : JSON.parse(savedValue);
    } catch (error) {
      throw new Error("Unable to load saved game session.", { cause: error });
    }
  }

  async save(snapshot: GameSessionSnapshot): Promise<void> {
    try {
      this.getStorage().setItem(
        GAME_SESSION_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
    } catch (error) {
      throw new Error("Unable to save game session.", { cause: error });
    }
  }

  async remove(): Promise<void> {
    try {
      this.getStorage().removeItem(GAME_SESSION_STORAGE_KEY);
    } catch (error) {
      throw new Error("Unable to remove saved game session.", { cause: error });
    }
  }
}

export const gameSessionRepository: GameSessionRepository =
  new LocalGameSessionRepository();
