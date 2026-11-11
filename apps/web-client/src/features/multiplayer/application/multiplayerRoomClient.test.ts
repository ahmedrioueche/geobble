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
        snapshot: {
          ...snapshot,
          config: { ...snapshot.config, subMode: "flag" },
          game: {
            ...snapshot.game,
            round: {
              ...snapshot.game.round!,
              prompt: { type: "flag", value: "🇨🇦", flagCode: "ca" },
              choices: [{ id: "choice-1", label: "🇨🇦", flagCode: "ca" }],
            },
          },
        },
      }),
    ).toBe(true);
    expect(
      isRoomServerEvent({
        type: "updated",
        snapshot: {
          ...snapshot,
          status: "checkpoint",
          config: { ...snapshot.config, endless: true },
          players: snapshot.players.map((player) => ({
            ...player,
            legScore: 20,
            checkpointsWon: 1,
          })),
          game: {
            ...snapshot.game,
            legNumber: 1,
            legRoundNumber: 10,
            lapNumber: 1,
            legMultiplier: 1,
            legTier: "easy",
            checkpointResumeAt: 11_000,
            checkpointPaused: false,
            checkpointSummary: {
              legNumber: 1,
              roundsInLeg: 10,
              winnerIds: ["player-1"],
              topLegScore: 20,
              nextLegNumber: 2,
              nextLegTier: "medium",
              nextLegMultiplier: 1.25,
              lapNumber: 1,
            },
          },
        },
      }),
    ).toBe(true);
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
    expect(
      isRoomServerEvent({
        type: "inspected",
        payload: {
          requestId: "inspect-1",
          roomId: "4821",
          visibility: "private",
          status: "waiting",
          playerCount: 1,
          maxPlayers: 8,
          requiresSecret: true,
        },
      }),
    ).toBe(true);
    expect(
      isRoomServerEvent({
        type: "error",
        payload: {
          requestId: "join-1",
          message: "Wrong secret.",
          code: "INVALID_SECRET",
        },
      }),
    ).toBe(true);
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

  it("inspects rooms, sends secrets on create/join, and retains roomSecret across updates", async () => {
    const transport = new FakeRoomTransport();
    const storage = new FakeStorage();
    storage.value = {
      roomId: "OLD1",
      playerId: "p-old",
      reconnectToken: "tok-old",
    };
    const client = createRoomClient(transport, storage, () => "req-1");

    const inspecting = client.inspectRoom(" 4821 ");
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:inspect"),
    );
    expect(transport.events.at(-1)).toEqual({
      eventName: "room:inspect",
      payload: { requestId: "req-1", roomId: "4821" },
    });
    // Inspecting must not wipe saved reconnect credentials.
    expect(storage.value).not.toBeNull();

    transport.receive({
      type: "inspected",
      payload: {
        requestId: "req-1",
        roomId: "4821",
        visibility: "private",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 8,
        requiresSecret: true,
      },
    });
    await expect(inspecting).resolves.toMatchObject({
      roomId: "4821",
      requiresSecret: true,
    });

    const creating = client.createRoom("Ada", undefined, "private", " Geo99 ");
    await vi.waitFor(() =>
      expect(transport.events.at(-1)?.eventName).toBe("room:create"),
    );
    expect(transport.events.at(-1)).toEqual({
      eventName: "room:create",
      payload: {
        requestId: "req-1",
        playerName: "Ada",
        visibility: "private",
        secret: "Geo99",
      },
    });
    transport.receive({
      type: "joined",
      payload: {
        requestId: "req-1",
        playerId: "player-1",
        reconnectToken: "token-1",
        nextCommandId: 1,
        snapshot: createSnapshot({ roomId: "4821" }),
        roomSecret: "Geo99",
      },
    });
    await creating;
    expect(client.getState().room?.roomSecret).toBe("Geo99");

    transport.receive({
      type: "updated",
      snapshot: createSnapshot({ roomId: "4821", revision: 2 }),
    });
    expect(client.getState().room?.roomSecret).toBe("Geo99");
  });

  it("recovers cleanly when disconnected mid-connect (e.g. React StrictMode) and does not auto-reconnect during room inspection", async () => {
    let connectCalls = 0;
    let listenerRef: RoomTransportListener | null = null;
    let firstConnectPending = true;
    const emitted: Array<{ eventName: string; payload: Record<string, unknown> }> = [];
    const transport: RoomTransport = {
      connect: async (listener) => {
        connectCalls += 1;
        listenerRef = listener;
        if (connectCalls === 1) {
          // Simulate an in-flight socket connection aborted by disconnect()
          await new Promise<void>((_, reject) => {
            const check = setInterval(() => {
              if (!firstConnectPending) {
                clearInterval(check);
                reject(new Error("Room connection was closed."));
              }
            }, 5);
          });
          return;
        }
        listener.onStatusChange("connected");
      },
      emit: (eventName, payload) => {
        emitted.push({
          eventName,
          payload: payload as Record<string, unknown>,
        });
      },
      disconnect: () => {
        firstConnectPending = false;
      },
    };
    const storage = new FakeStorage();
    storage.value = {
      roomId: "OLD1",
      playerId: "p-old",
      reconnectToken: "tok-old",
    };

    const client = createRoomClient(transport, storage, () => "req-strict");
    const firstInspect = client.inspectRoom("4821");
    await vi.waitFor(() => expect(connectCalls).toBe(1));

    // Simulate StrictMode cleanup disconnecting while connect() is still in flight
    client.disconnect();
    await expect(firstInspect).rejects.toThrow("Room connection was closed.");

    // Second mount must initiate a fresh transport connection and emit room:inspect
    const secondInspect = client.inspectRoom("4821");
    await vi.waitFor(() => expect(connectCalls).toBe(2));
    await vi.waitFor(() =>
      expect(emitted.some((item) => item.eventName === "room:inspect")).toBe(
        true,
      ),
    );
    // Must not auto-emit room:reconnect for OLD1 while inspecting 4821
    expect(emitted.some((item) => item.eventName === "room:reconnect")).toBe(
      false,
    );

    listenerRef!.onEvent({
      type: "inspected",
      payload: {
        requestId: "req-strict",
        roomId: "4821",
        visibility: "public",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 8,
        requiresSecret: false,
      },
    });
    await expect(secondInspect).resolves.toMatchObject({
      roomId: "4821",
      visibility: "public",
    });
  });
});
