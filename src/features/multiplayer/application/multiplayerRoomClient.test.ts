import { describe, expect, it } from "vitest";
import {
  createRoomClient,
  type RoomTransport,
  type RoomTransportListener,
} from "./multiplayerRoomClient";
import type {
  RoomCommand,
  RoomRequest,
  RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import { isRoomServerMessage } from "../contracts/multiplayerRoomProtocol";

const createSnapshot = (
  changes: Partial<RoomSnapshot> = {},
): RoomSnapshot => ({
  roomId: "room-1",
  revision: 1,
  status: "playing",
  players: [
    { id: "player-1", name: "Player", ready: true, connected: true },
  ],
  game: {
    mode: "identify",
    pinDirection: "locate",
    subMode: "name",
    challengeType: "world",
    challengeValue: 0,
    timeRemaining: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    totalQuestions: 1,
    totalAttempts: 0,
    correctAttempts: 0,
    gameStatus: "playing",
    currentCountryCode: "CAN",
    choices: [],
    choiceCodes: [],
    missionId: "mission-1",
    revealed: false,
    pinLocation: null,
  },
  ...changes,
});

class FakeRoomTransport implements RoomTransport {
  listener: RoomTransportListener | null = null;
  request: RoomRequest | null = null;
  commands: Array<{ roomId: string; command: RoomCommand }> = [];
  connectError: Error | null = null;
  sendError: Error | null = null;

  async connect(
    request: RoomRequest,
    listener: RoomTransportListener,
  ): Promise<void> {
    this.request = request;
    this.listener = listener;
    if (this.connectError) throw this.connectError;
  }

  async sendCommand(roomId: string, command: RoomCommand): Promise<void> {
    if (this.sendError) throw this.sendError;
    this.commands.push({ roomId, command });
  }

  async disconnect(): Promise<void> {}

  receive(message: unknown) {
    this.listener?.onMessage(message);
  }

  setStatus(status: "connected" | "reconnecting" | "disconnected") {
    this.listener?.onStatusChange(status);
  }
}

describe("multiplayer room protocol", () => {
  it("validates room snapshots and rejects malformed server messages", () => {
    const snapshot = createSnapshot();
    expect(
      isRoomServerMessage({
        type: "room-updated",
        snapshot,
      }),
    ).toBe(true);
    expect(
      isRoomServerMessage({
        type: "room-updated",
        snapshot: { ...snapshot, revision: -1 },
      }),
    ).toBe(false);
    expect(
      isRoomServerMessage({ type: "unrecognized-message" }),
    ).toBe(false);
  });
});

describe("createRoomClient", () => {
  it("connects with a room request and adopts the matching room snapshot", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    const updates: string[] = [];
    client.subscribe((state) => updates.push(state.status));

    await client.connect({ type: "create-room", playerName: "Ada" });
    expect(client.getState().status).toBe("connecting");
    expect(transport.request).toEqual({
      type: "create-room",
      requestId: "request-1",
      playerName: "Ada",
    });

    transport.setStatus("connected");
    transport.receive({
      type: "room-joined",
      requestId: "request-1",
      playerId: "player-1",
      snapshot: createSnapshot(),
    });
    expect(client.getState()).toMatchObject({
      status: "connected",
      room: {
        playerId: "player-1",
        snapshot: { roomId: "room-1", revision: 1 },
      },
    });
    expect(updates).toContain("connecting");
    expect(updates).toContain("connected");
  });

  it("submits commands against the latest known room revision and tracks responses", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    await client.connect({ type: "join-room", roomId: "room-1", playerName: "Ada" });
    transport.receive({
      type: "room-joined",
      requestId: "request-1",
      playerId: "player-1",
      snapshot: createSnapshot(),
    });

    const commandId = await client.submitCommand({
      type: "answer",
      answerCountryCode: "CAN",
    });
    expect(commandId).toBe(1);
    expect(transport.commands[0]).toEqual({
      roomId: "room-1",
      command: {
        type: "answer",
        answerCountryCode: "CAN",
        commandId: 1,
        expectedRevision: 1,
        missionId: "mission-1",
      },
    });
    expect(client.getState().pendingCommandIds).toEqual([1]);

    transport.receive({
      type: "command-accepted",
      roomId: "room-1",
      commandId: 1,
      revision: 2,
    });
    expect(client.getState()).toMatchObject({
      pendingCommandIds: [],
      lastAcknowledgedRevision: 2,
    });

    transport.receive({
      type: "room-updated",
      snapshot: createSnapshot({ revision: 2, game: { ...createSnapshot().game, score: 10 } }),
    });
    expect(client.getState().room?.snapshot.game.score).toBe(10);
  });

  it("ignores stale snapshots and updates from a different room", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    await client.connect({ type: "join-room", roomId: "room-1", playerName: "Ada" });
    transport.receive({
      type: "room-joined",
      requestId: "request-1",
      playerId: "player-1",
      snapshot: createSnapshot(),
    });

    transport.receive({
      type: "room-updated",
      snapshot: createSnapshot({ revision: 1, game: { ...createSnapshot().game, score: 50 } }),
    });
    transport.receive({
      type: "room-updated",
      snapshot: createSnapshot({ roomId: "room-2", revision: 2 }),
    });
    expect(client.getState().room?.snapshot).toEqual(createSnapshot());
  });

  it("removes rejected commands and exposes transport errors", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    await client.connect({ type: "join-room", roomId: "room-1", playerName: "Ada" });
    transport.receive({
      type: "room-joined",
      requestId: "request-1",
      playerId: "player-1",
      snapshot: createSnapshot(),
    });

    await client.submitCommand({ type: "skip" });
    transport.receive({
      type: "command-rejected",
      roomId: "room-1",
      commandId: 1,
      reason: "stale-revision",
    });
    expect(client.getState()).toMatchObject({
      pendingCommandIds: [],
      error: "Command rejected: stale-revision.",
    });

    transport.sendError = new Error("offline");
    await expect(client.submitCommand({ type: "reveal" })).rejects.toThrow(
      "offline",
    );
    expect(client.getState()).toMatchObject({
      pendingCommandIds: [],
      error: "offline",
    });
  });

  it("reports matching room request errors as connection errors", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    await client.connect({ type: "join-room", roomId: "room-1", playerName: "Ada" });

    transport.receive({
      type: "room-error",
      requestId: "other-request",
      message: "Ignore this response.",
    });
    expect(client.getState().status).toBe("connecting");

    transport.receive({
      type: "room-error",
      requestId: "request-1",
      message: "Room is full.",
    });
    expect(client.getState()).toMatchObject({
      status: "error",
      error: "Room is full.",
    });
  });

  it("tracks reconnect lifecycle and disconnects without changing solo game state", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, () => "request-1");
    await client.connect({ type: "join-room", roomId: "room-1", playerName: "Ada" });
    transport.setStatus("connected");
    transport.setStatus("reconnecting");
    expect(client.getState().status).toBe("reconnecting");
    transport.setStatus("connected");
    await client.disconnect();
    expect(client.getState()).toEqual({
      status: "disconnected",
      room: null,
      pendingCommandIds: [],
      lastAcknowledgedRevision: null,
      error: null,
    });
  });
});
