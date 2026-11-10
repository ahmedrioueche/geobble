import { describe, expect, it, vi } from "vitest";
import {
  isRoomServerEvent,
  type RoomServerEvent,
  type RoomSnapshot,
} from "../contracts/multiplayerRoomProtocol";
import {
  createRoomClient,
  type RoomCredentialStorage,
  type RoomTransport,
} from "./multiplayerRoomClient";
import type { RoomTransportListener } from "../infrastructure/socketIoRoomTransport";

const createSnapshot = (
  changes: Partial<RoomSnapshot> = {},
): RoomSnapshot => ({
  roomId: "ROOM2345",
  revision: 1,
  status: "waiting",
  visibility: "private",
  adminPlayerId: "player-1",
  config: {
    mode: "identify",
    pinDirection: "locate",
    subMode: "name",
    challengeType: "world",
    challengeValue: 0,
  },
  pendingConfig: null,
  players: [
    {
      id: "player-1",
      name: "Ada",
      isAdmin: true,
      connected: true,
      score: 0,
      streak: 0,
      maxStreak: 0,
      pinLocation: null,
      answered: false,
    },
    {
      id: "player-2",
      name: "Grace",
      isAdmin: false,
      connected: true,
      score: 0,
      streak: 0,
      maxStreak: 0,
      pinLocation: null,
      answered: false,
    },
  ],
  game: { startedAt: null, timerDeadlineAt: null, round: null },
  ...changes,
});

class FakeRoomTransport implements RoomTransport {
  listener: RoomTransportListener | null = null;
  events: Array<{ eventName: string; payload: Record<string, unknown> }> = [];
  connectError: Error | null = null;
  emitError: Error | null = null;

  async connect(listener: RoomTransportListener): Promise<void> {
    this.listener = listener;
    if (this.connectError) throw this.connectError;
  }

  emit(eventName: string, payload: unknown): void {
    if (this.emitError) throw this.emitError;
    this.events.push({
      eventName,
      payload: payload as Record<string, unknown>,
    });
  }

  disconnect(): void {}

  receive(event: RoomServerEvent): void {
    this.listener?.onEvent(event);
  }

  setStatus(status: "connected" | "reconnecting" | "disconnected"): void {
    this.listener?.onStatusChange(status);
  }
}

class FakeStorage implements RoomCredentialStorage {
  value: { roomId: string; playerId: string; reconnectToken: string } | null =
    null;

  read() {
    return this.value;
  }

  write(credentials: {
    roomId: string;
    playerId: string;
    reconnectToken: string;
  }) {
    this.value = credentials;
  }

  clear() {
    this.value = null;
  }
}

const createJoinedEvent = (
  requestId: string,
  snapshot = createSnapshot(),
  reconnectToken = "private-token",
  nextCommandId = 1,
): RoomServerEvent => ({
  type: "joined",
  payload: {
    requestId,
    playerId: "player-1",
    reconnectToken,
    nextCommandId,
    snapshot,
  },
});

describe("multiplayer room protocol", () => {
  it("validates the server snapshot and socket event shapes", () => {
    const snapshot = createSnapshot({
      status: "playing",
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Ottawa" },
          choices: [{ id: "choice-1", label: "Canada" }],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    expect(isRoomServerEvent({ type: "updated", snapshot })).toBe(true);
    expect(
      isRoomServerEvent({
        type: "updated",
        snapshot: { ...snapshot, revision: -1 },
      }),
    ).toBe(false);
    expect(
      isRoomServerEvent({
        type: "error",
        payload: {
          requestId: "request-1",
          message: "Reconnect rejected.",
          code: "NOT_AUTHORIZED",
        },
      }),
    ).toBe(true);
    expect(
      isRoomServerEvent({
        type: "error",
        payload: {
          requestId: "request-1",
          message: "Reconnect rejected.",
          code: "UNKNOWN_ERROR",
        },
      }),
    ).toBe(false);
    expect(
      isRoomServerEvent({
        type: "command-rejected",
        payload: {
          roomId: snapshot.roomId,
          commandId: null,
          reason: "invalid-command",
        },
      }),
    ).toBe(true);
    expect(isRoomServerEvent({ type: "unknown", payload: {} })).toBe(false);
  });
});

describe("createRoomClient", () => {
  it("creates a room using the server protocol and keeps credentials out of UI state", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    const client = createRoomClient(transport, storage, () => "request-1");

    const joining = client.createRoom(" Ada ");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    expect(transport.events[0]).toEqual({
      eventName: "room:create",
      payload: {
        requestId: "request-1",
        playerName: "Ada",
        visibility: "private",
      },
    });

    transport.receive(createJoinedEvent("request-1"));
    await joining;

    expect(client.getState()).toMatchObject({
      status: "connected",
      room: {
        playerId: "player-1",
        snapshot: { roomId: "ROOM2345" },
      },
      reconnectAvailable: true,
    });
    expect(client.getState()).not.toHaveProperty("reconnectToken");
    expect(storage.value).toEqual({
      roomId: "ROOM2345",
      playerId: "player-1",
      reconnectToken: "private-token",
    });
  });

  it("requests public matchmaking through the shared room-join confirmation flow", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(
      transport,
      new FakeStorage(),
      () => "request-match",
    );
    const joining = client.joinPublicRoom(" Ada ");

    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    expect(transport.events[0]).toEqual({
      eventName: "room:matchmake",
      payload: { requestId: "request-match", playerName: "Ada" },
    });
    transport.receive(
      createJoinedEvent(
        "request-match",
        createSnapshot({ visibility: "public" }),
      ),
    );
    await joining;
    expect(client.getState().room?.snapshot.visibility).toBe("public");
  });

  it("waits for server confirmation when changing room settings", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(
      transport,
      new FakeStorage(),
      () => "settings-request",
    );
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("settings-request"));
    await joining;

    const saving = client.changeSettings({
      mode: "identify",
      pinDirection: "locate",
      subMode: "capital",
      challengeType: "world",
      challengeValue: 0,
    });
    expect(transport.events.at(-1)).toMatchObject({
      eventName: "room:change-settings",
      payload: {
        requestId: "settings-request",
        config: { subMode: "capital" },
      },
    });
    transport.receive({
      type: "settings-accepted",
      payload: {
        requestId: "settings-request",
        roomId: "ROOM2345",
        queued: false,
        revision: 2,
      },
    });
    await expect(saving).resolves.toBeUndefined();
    expect(client.getState().settingsAccepted).toEqual({
      queued: false,
      revision: 2,
    });
  });

  it("allows creating a new room without reconnecting to the saved room", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    storage.value = {
      roomId: "ROOM2345",
      playerId: "player-1",
      reconnectToken: "saved-token",
    };
    const client = createRoomClient(transport, storage, () => "new-room-request");
    const creating = client.createRoom("Ada");

    expect(storage.value).toBeNull();
    expect(client.getState()).toMatchObject({
      reconnectAvailable: false,
      reconnectRequired: false,
    });
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    expect(transport.events[0]?.eventName).toBe("room:create");
    transport.receive(createJoinedEvent("new-room-request"));
    await creating;
    expect(client.getState().room?.snapshot.roomId).toBe("ROOM2345");
  });

  it("sends authoritative commands and adopts server acknowledgements and snapshots", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, new FakeStorage(), () => "request-1");
    const joining = client.joinRoom("room2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1"));
    await joining;

    transport.receive({
      type: "updated",
      snapshot: createSnapshot({
        revision: 2,
        status: "playing",
        game: {
          startedAt: 5,
          timerDeadlineAt: null,
          round: {
            missionId: "mission-1",
            number: 1,
            prompt: { type: "instruction", value: "Identify the highlighted country" },
            choices: [{ id: "choice-abc", label: "Canada" }],
            revealed: false,
            answerReveal: null,
          },
        },
      }),
    });

    const commandId = await client.submitCommand({
      type: "answer",
      answerCountryCode: null,
      choiceId: "choice-abc",
    });
    expect(commandId).toBe(1);
    expect(transport.events.at(-1)).toMatchObject({
      eventName: "room:command",
      payload: {
        type: "answer",
        answerCountryCode: null,
        choiceId: "choice-abc",
        commandId: 1,
        expectedRevision: 2,
        missionId: "mission-1",
      },
    });

    transport.receive({
      type: "command-accepted",
      payload: {
        roomId: "ROOM2345",
        commandId: 1,
        revision: 3,
        answerResult: true,
      },
    });
    expect(client.getState()).toMatchObject({
      pendingCommandIds: [],
      lastAcknowledgedRevision: 3,
      lastAnswerResult: true,
    });
  });

  it("reconnects with rotated credentials and replaces the stored token", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    const client = createRoomClient(transport, storage, () => "request-1");
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1"));
    await joining;

    transport.setStatus("reconnecting");
    transport.setStatus("connected");
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:reconnect"),
    );
    expect(transport.events.at(-1)).toMatchObject({
      eventName: "room:reconnect",
      payload: {
        requestId: "request-1",
        roomId: "ROOM2345",
        playerId: "player-1",
        reconnectToken: "private-token",
      },
    });
    transport.receive(
      createJoinedEvent("request-1", createSnapshot({ revision: 4 }), "rotated"),
    );
    await vi.waitFor(() => expect(storage.value?.reconnectToken).toBe("rotated"));
    expect(storage.value?.reconnectToken).toBe("rotated");
    expect(client.getState().room?.snapshot.revision).toBe(4);
  });

  it("allows retrying a failed reconnect and rotates credentials on success", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    storage.value = {
      roomId: "ROOM2345",
      playerId: "player-1",
      reconnectToken: "old-token",
    };
    let requestNumber = 0;
    const client = createRoomClient(
      transport,
      storage,
      () => `request-${++requestNumber}`,
    );

    const resuming = client.resume();
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:reconnect"),
    );
    transport.receive({
      type: "error",
      payload: {
        requestId: "request-1",
        message: "The player cannot reconnect yet.",
      },
    });
    await vi.waitFor(() =>
      expect(client.getState()).toMatchObject({
        status: "error",
        reconnectRequired: true,
      }),
    );
    await resuming;

    const retrying = client.retryReconnect();
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.payload.requestId).toBe("request-2"),
    );
    transport.receive(
      createJoinedEvent("request-2", createSnapshot({ revision: 3 }), "new-token"),
    );
    await vi.waitFor(() =>
      expect(client.getState()).toMatchObject({
        status: "connected",
        reconnectRequired: false,
        room: { snapshot: { revision: 3 } },
      }),
    );
    await retrying;
    expect(storage.value?.reconnectToken).toBe("new-token");
  });

  it("clears room state and saved credentials when reconnect is no longer authorized", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    storage.value = {
      roomId: "ROOM2345",
      playerId: "player-1",
      reconnectToken: "saved-token",
    };
    const client = createRoomClient(
      transport,
      storage,
      () => "request-reconnect",
    );

    const resuming = client.resume();
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:reconnect"),
    );
    transport.receive({
      type: "error",
      payload: {
        requestId: "request-reconnect",
        code: "NOT_AUTHORIZED",
        message: "This player is not authorized to reconnect.",
      },
    });
    await resuming;

    expect(client.getState()).toMatchObject({
      status: "connected",
      room: null,
      reconnectAvailable: false,
      reconnectRequired: false,
      error: "Your saved room session is no longer valid. Join or create a room.",
    });
    expect(storage.value).toBeNull();

    const reloadedClient = createRoomClient(
      new FakeRoomTransport(),
      storage,
      () => "unused-request",
    );
    expect(reloadedClient.getState()).toMatchObject({
      room: null,
      reconnectAvailable: false,
      reconnectRequired: false,
    });

    const creating = client.createRoom("Ada");
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:create"),
    );
    transport.receive(createJoinedEvent("request-reconnect"));
    await creating;
    expect(client.getState().room?.snapshot.roomId).toBe("ROOM2345");
  });

  it("drops a stale in-memory room after a denied automatic reconnect", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    const client = createRoomClient(transport, storage, () => "request-1");
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1"));
    await joining;

    transport.setStatus("reconnecting");
    transport.setStatus("connected");
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:reconnect"),
    );
    transport.receive({
      type: "error",
      payload: {
        requestId: "request-1",
        code: "NOT_AUTHORIZED",
        message: "This player is not authorized to reconnect.",
      },
    });

    await vi.waitFor(() =>
      expect(client.getState()).toMatchObject({
        room: null,
        reconnectAvailable: false,
        reconnectRequired: false,
      }),
    );
    expect(storage.value).toBeNull();
  });

  it("keeps room connectivity when a room action is rejected", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, new FakeStorage(), () => "request-1");
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1"));
    await joining;

    client.startRoom();
    transport.receive({
      type: "error",
      payload: {
        requestId: "request-1",
        message: "Room action rejected.",
      },
    });

    expect(client.getState()).toMatchObject({
      status: "connected",
      room: { snapshot: { roomId: "ROOM2345" } },
      error: "Room action rejected.",
    });
  });

  it("clears room credentials after a confirmed leave", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    const client = createRoomClient(transport, storage, () => "request-1");
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1"));
    await joining;

    const leaving = client.leaveRoom();
    await Promise.resolve();
    expect(transport.events.at(-1)?.eventName).toBe("room:leave");
    transport.receive({
      type: "left",
      payload: { roomId: "ROOM2345" },
    });
    await leaving;
    expect(client.getState().room).toBeNull();
    expect(storage.value).toBeNull();
  });

  it("surfaces command rejections and transport errors", async () => {
    const transport = new FakeRoomTransport();
    const client = createRoomClient(transport, new FakeStorage(), () => "request-1");
    const joining = client.joinRoom("ROOM2345", "Ada");
    await vi.waitFor(() => expect(transport.events).toHaveLength(1));
    transport.receive(createJoinedEvent("request-1", createSnapshot({
      status: "playing",
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Canada" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    })));
    await joining;

    await client.submitCommand({ type: "skip" });
    transport.receive({
      type: "command-rejected",
      payload: {
        roomId: "ROOM2345",
        commandId: 1,
        reason: "not-allowed",
        revision: 1,
      },
    });
    expect(client.getState().error).toContain("not-allowed");

    transport.emitError = new Error("offline");
    await expect(client.submitCommand({ type: "reveal" })).rejects.toThrow(
      "offline",
    );
    expect(client.getState().error).toBe("offline");
  });
});
