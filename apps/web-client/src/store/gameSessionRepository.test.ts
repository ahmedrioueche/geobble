import { describe, expect, it, vi } from "vitest";
import {
  GAME_SESSION_STORAGE_KEY,
  type GameSessionSnapshot,
} from "./gameSessionSnapshot";
import {
  LocalGameSessionRepository,
  type GameSessionRepository,
} from "./gameSessionRepository";

const snapshot = {
  version: 1,
  savedAt: 100,
  id: "session-1",
  score: 0,
} as GameSessionSnapshot;

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  } as unknown as Storage;
};

describe("LocalGameSessionRepository", () => {
  it("returns null when no saved session exists", async () => {
    const repository = new LocalGameSessionRepository(createStorage);

    await expect(repository.load()).resolves.toBeNull();
  });

  it("saves and loads a JSON session snapshot using the existing key", async () => {
    const storage = createStorage();
    const repository = new LocalGameSessionRepository(() => storage);

    await repository.save(snapshot);

    expect(storage.setItem).toHaveBeenCalledWith(
      GAME_SESSION_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
    await expect(repository.load()).resolves.toEqual(snapshot);
  });

  it("removes the saved session", async () => {
    const storage = createStorage();
    const repository = new LocalGameSessionRepository(() => storage);
    await repository.save(snapshot);

    await repository.remove();

    expect(storage.removeItem).toHaveBeenCalledWith(GAME_SESSION_STORAGE_KEY);
    await expect(repository.load()).resolves.toBeNull();
  });

  it("surfaces malformed JSON as a load failure", async () => {
    const storage = createStorage();
    vi.mocked(storage.getItem).mockReturnValue("{invalid json");
    const repository = new LocalGameSessionRepository(() => storage);

    await expect(repository.load()).rejects.toThrow(
      "Unable to load saved game session.",
    );
  });

  it.each([
    ["read", "getItem"],
    ["write", "setItem"],
    ["remove", "removeItem"],
  ] as const)("surfaces %s storage failures", async (operation, method) => {
    const storage = createStorage();
    const failure = new DOMException("Storage unavailable", "SecurityError");
    vi.mocked(storage[method]).mockImplementation(() => {
      throw failure;
    });
    const repository: GameSessionRepository = new LocalGameSessionRepository(
      () => storage,
    );

    const operationPromise =
      operation === "read"
        ? repository.load()
        : operation === "write"
          ? repository.save(snapshot)
          : repository.remove();

    await expect(operationPromise).rejects.toMatchObject({ cause: failure });
  });
});
