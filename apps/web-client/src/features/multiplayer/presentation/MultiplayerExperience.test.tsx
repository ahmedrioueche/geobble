// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomSnapshot } from "../contracts/multiplayerRoomProtocol";
import type { RoomClientState } from "../application/multiplayerRoomClient";
import { MultiplayerExperience } from "./MultiplayerExperience";

const mocks = vi.hoisted(() => ({
  useRoomClient: vi.fn(),
  setReady: vi.fn(),
  startRoom: vi.fn(),
  submitCommand: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  changeSettings: vi.fn(),
  forgetReconnect: vi.fn(),
  retryReconnect: vi.fn(),
}));

vi.mock("../application/useRoomClient", () => ({
  useRoomClient: mocks.useRoomClient,
}));
vi.mock("../../map/WorldMap", () => ({ WorldMap: () => null }));

const createSnapshot = (
  changes: Partial<RoomSnapshot> = {},
): RoomSnapshot => ({
  roomId: "ROOM2345",
  revision: 1,
  status: "waiting",
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
      ready: true,
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
      ready: true,
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

const createClientState = (
  snapshot?: RoomSnapshot,
): RoomClientState => ({
  status: snapshot ? "connected" : "disconnected",
  room: snapshot ? { playerId: "player-1", snapshot } : null,
  pendingCommandIds: [],
  lastAcknowledgedRevision: null,
  lastAnswerResult: null,
  settingsAccepted: null,
  error: null,
  reconnectAvailable: false,
  reconnectRequired: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useRoomClient.mockReturnValue({
    client: {
      createRoom: mocks.createRoom.mockResolvedValue(undefined),
      joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
      setReady: mocks.setReady,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      submitCommand: mocks.submitCommand.mockResolvedValue(1),
      leaveRoom: mocks.leaveRoom.mockResolvedValue(undefined),
      forgetReconnect: mocks.forgetReconnect,
      retryReconnect: mocks.retryReconnect.mockResolvedValue(undefined),
    },
    state: createClientState(),
  });
});

describe("MultiplayerExperience", () => {
  it("creates a room from the entry dialog", async () => {
    render(<MultiplayerExperience countries={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(mocks.createRoom).toHaveBeenCalledWith("Ada", undefined));
  });

  it("sends lobby readiness and admin start actions", () => {
    const snapshot = createSnapshot();
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        setReady: mocks.setReady,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(snapshot),
    });
    render(<MultiplayerExperience countries={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Not ready" }));
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(mocks.setReady).toHaveBeenCalledWith(false);
    expect(mocks.startRoom).toHaveBeenCalledOnce();
  });

  it("submits a choice answer through the room client", () => {
    const snapshot = createSnapshot({
      status: "playing",
      config: {
        mode: "reverse",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "world",
        challengeValue: 0,
      },
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Ottawa" },
          choices: [{ id: "choice-canada", label: "Canada" }],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        setReady: mocks.setReady,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand.mockResolvedValue(1),
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(snapshot),
    });
    render(<MultiplayerExperience countries={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Canada" }));

    expect(mocks.submitCommand).toHaveBeenCalledWith({
      type: "answer",
      answerCountryCode: null,
      choiceId: "choice-canada",
    });
  });
});
