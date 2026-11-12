// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { CREDENTIALS_KEY, getBrowserStorage } from "./roomCredentialStorage";

describe("roomCredentialStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads null when no credentials stored", () => {
    const storage = getBrowserStorage();
    expect(storage.read()).toBeNull();
  });

  it("writes and reads valid credentials", () => {
    const storage = getBrowserStorage();
    storage.write({
      roomId: "ROOM1234",
      playerId: "player-1",
      reconnectToken: "token-abc",
    });

    expect(storage.read()).toEqual({
      roomId: "ROOM1234",
      playerId: "player-1",
      reconnectToken: "token-abc",
    });
  });

  it("clears credentials from storage", () => {
    const storage = getBrowserStorage();
    storage.write({
      roomId: "ROOM1234",
      playerId: "player-1",
      reconnectToken: "token-abc",
    });

    storage.clear();
    expect(storage.read()).toBeNull();
    expect(window.localStorage.getItem(CREDENTIALS_KEY)).toBeNull();
  });

  it("safely handles corrupted JSON and clears invalid data", () => {
    window.localStorage.setItem(CREDENTIALS_KEY, "invalid-json{{");
    const storage = getBrowserStorage();
    expect(storage.read()).toBeNull();
    expect(window.localStorage.getItem(CREDENTIALS_KEY)).toBeNull();
  });

  it("safely handles incomplete objects and clears invalid data", () => {
    window.localStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ roomId: "ROOM1234" }), // missing playerId and reconnectToken
    );
    const storage = getBrowserStorage();
    expect(storage.read()).toBeNull();
    expect(window.localStorage.getItem(CREDENTIALS_KEY)).toBeNull();
  });
});
