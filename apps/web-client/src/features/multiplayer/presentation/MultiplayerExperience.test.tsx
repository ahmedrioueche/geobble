// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomSnapshot } from "../contracts/multiplayerRoomProtocol";
import type { RoomClientState } from "../application/multiplayerRoomClient";
import { MultiplayerExperience } from "./MultiplayerExperience";

const mocks = vi.hoisted(() => ({
  useRoomClient: vi.fn(),
  playOffline: vi.fn(),
  setReady: vi.fn(),
  startRoom: vi.fn(),
  submitCommand: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  joinPublicRoom: vi.fn(),
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
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  mocks.useRoomClient.mockReturnValue({
    client: {
      createRoom: mocks.createRoom.mockResolvedValue(undefined),
      joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
      joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
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

afterEach(() => {
  cleanup();
});

describe("MultiplayerExperience", () => {
  const renderExperience = (
    state: RoomClientState = createClientState(),
  ) => {
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom.mockResolvedValue(undefined),
        joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
        joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
        setReady: mocks.setReady,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand.mockResolvedValue(1),
        leaveRoom: mocks.leaveRoom.mockResolvedValue(undefined),
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect.mockResolvedValue(undefined),
      },
      state,
    });
    return render(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );
  };

  it("creates a private room from the room entry page", async () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create private room" }));

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith("Ada", undefined, "private"),
    );
  });

  it("saves the player name and pre-fills it when multiplayer is opened again", () => {
    const firstRender = renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });

    expect(
      window.localStorage.getItem("geobble:multiplayer-player-name"),
    ).toBe("Ada");

    firstRender.unmount();
    renderExperience();
    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));

    expect(
      (screen.getByLabelText("Player name") as HTMLInputElement).value,
    ).toBe("Ada");
  });

  it("allows joining public matchmaking even when no rooms are currently available", async () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join public game" }));

    await waitFor(() => expect(mocks.joinPublicRoom).toHaveBeenCalledWith("Ada"));
  });

  it("can create a public room", async () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^public$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create public room" }));

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith("Ada", undefined, "public"),
    );
  });

  it("offers reconnecting to the latest room without blocking new rooms", async () => {
    renderExperience({
      ...createClientState(),
      status: "error",
      reconnectAvailable: true,
      reconnectRequired: true,
      error: "Could not reconnect.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Connect to latest room" }),
    );
    expect(mocks.retryReconnect).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create private room" }));

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith("Ada", undefined, "private"),
    );
  });

  it("sends lobby readiness and admin start actions", () => {
    const snapshot = createSnapshot();
    renderExperience(createClientState(snapshot));

    expect(screen.getByRole("region", { name: "Room settings" })).toBeTruthy();
    expect(screen.getByText("Whole world")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not ready" }));
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(mocks.setReady).toHaveBeenCalledWith(false);
    expect(mocks.startRoom).toHaveBeenCalledOnce();
  });

  it("shows room settings to non-admin players without edit controls", () => {
    const snapshot = createSnapshot({
      players: createSnapshot().players.map((player) => ({
        ...player,
        isAdmin: false,
      })),
    });
    renderExperience(createClientState(snapshot));

    expect(screen.getByRole("region", { name: "Room settings" })).toBeTruthy();
    expect(screen.getByText("Country name")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
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
    renderExperience(createClientState(snapshot));

    fireEvent.click(screen.getByRole("button", { name: "Canada" }));

    expect(mocks.submitCommand).toHaveBeenCalledWith({
      type: "answer",
      answerCountryCode: null,
      choiceId: "choice-canada",
    });
  });

  it("copies the room code and shows join and disconnect toasts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const initialSnapshot = createSnapshot({
      players: [
        {
          ...createSnapshot().players[0]!,
          id: "player-1",
          name: "Ada",
        },
        {
          ...createSnapshot().players[1]!,
          id: "player-2",
          name: "Grace",
          connected: false,
        },
      ],
    });
    const client = {
      createRoom: mocks.createRoom.mockResolvedValue(undefined),
      joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
      joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
      setReady: mocks.setReady,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      submitCommand: mocks.submitCommand.mockResolvedValue(1),
      leaveRoom: mocks.leaveRoom.mockResolvedValue(undefined),
      forgetReconnect: mocks.forgetReconnect,
      retryReconnect: mocks.retryReconnect.mockResolvedValue(undefined),
    };
    const firstState = createClientState(initialSnapshot);
    mocks.useRoomClient.mockReturnValue({ client, state: firstState });
    const view = render(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy room code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ROOM2345"));
    expect(await screen.findByText("Room code copied")).toBeTruthy();

    const joinedSnapshot = createSnapshot({
      revision: 2,
      players: initialSnapshot.players.map((player) => ({
        ...player,
        connected: true,
      })),
    });
    mocks.useRoomClient.mockReturnValue({
      client,
      state: createClientState(joinedSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );
    expect(await screen.findByText("Grace joined the room")).toBeTruthy();

    const disconnectedSnapshot = createSnapshot({
      revision: 3,
      players: joinedSnapshot.players.map((player) => ({
        ...player,
        connected: player.id === "player-1",
      })),
    });
    mocks.useRoomClient.mockReturnValue({
      client,
      state: createClientState(disconnectedSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );
    expect(await screen.findByText("Grace disconnected")).toBeTruthy();
  });

  it("shows distinct solo and multiplayer home actions", () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Single player" }));
    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));

    expect(mocks.playOffline).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { name: /geobble multiplayer/i }),
    ).toBeTruthy();
  });
});
