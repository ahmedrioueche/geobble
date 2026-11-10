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
  setPaused: vi.fn(),
  startRoom: vi.fn(),
  submitCommand: vi.fn(),
  sendReaction: vi.fn(),
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

const createSnapshot = (changes: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
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

const createClientState = (snapshot?: RoomSnapshot): RoomClientState => ({
  status: snapshot ? "connected" : "disconnected",
  room: snapshot ? { playerId: "player-1", snapshot } : null,
  pendingCommandIds: [],
  lastAcknowledgedRevision: null,
  lastAnswerResult: null,
  settingsAccepted: null,
  lastReaction: null,
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
      setPaused: mocks.setPaused,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      submitCommand: mocks.submitCommand.mockResolvedValue(1),
      sendReaction: mocks.sendReaction,
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
  const renderExperience = (state: RoomClientState = createClientState()) => {
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom.mockResolvedValue(undefined),
        joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
        joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
        setReady: mocks.setReady,
        setPaused: mocks.setPaused,
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
    fireEvent.click(
      screen.getByRole("button", { name: "Create private room" }),
    );

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith(
        "Ada",
        undefined,
        "private",
      ),
    );
  });

  it("saves the player name and pre-fills it when multiplayer is opened again", () => {
    const firstRender = renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });

    expect(window.localStorage.getItem("geobble:multiplayer-player-name")).toBe(
      "Ada",
    );

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

    await waitFor(() =>
      expect(mocks.joinPublicRoom).toHaveBeenCalledWith("Ada"),
    );
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
    fireEvent.click(
      screen.getByRole("button", { name: "Create private room" }),
    );

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith(
        "Ada",
        undefined,
        "private",
      ),
    );
  });

  it("sends lobby readiness and admin start actions with responsive loading states", () => {
    const snapshot = createSnapshot();
    renderExperience(createClientState(snapshot));

    expect(screen.getByRole("region", { name: "Room settings" })).toBeTruthy();
    expect(screen.getByText("Whole world")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "I'm not ready" }));
    expect(
      screen.getByRole("button", { name: "Updating…" }).getAttribute("aria-busy"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(
      screen
        .getByRole("button", { name: "Starting game…" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    expect(screen.getByRole("status", { name: "Starting game" })).toBeTruthy();
    expect(
      screen.getByText("Preparing round 1 for 2 players…"),
    ).toBeTruthy();

    expect(mocks.setReady).toHaveBeenCalledWith(false);
    expect(mocks.startRoom).toHaveBeenCalledOnce();
  });

  it("makes the ready action explicit and changes its color with the player's state", () => {
    const snapshot = createSnapshot({
      players: createSnapshot().players.map((player) => ({
        ...player,
        ready: player.id !== "player-1",
      })),
    });
    const view = renderExperience(createClientState(snapshot));
    const readyButton = screen.getByRole("button", { name: "I'm ready" });

    expect(screen.getByText("Ready to play? Let the host know.")).toBeTruthy();
    expect(readyButton.getAttribute("aria-pressed")).toBe("false");
    expect(readyButton.className).toContain("bg-sky-500");
    fireEvent.click(readyButton);
    expect(mocks.setReady).toHaveBeenCalledWith(true);

    const readySnapshot = createSnapshot({
      players: createSnapshot().players.map((player) => ({
        ...player,
        ready: true,
      })),
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(readySnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    const notReadyButton = screen.getByRole("button", {
      name: "I'm not ready",
    });
    expect(screen.getByText("You're ready to play.")).toBeTruthy();
    expect(notReadyButton.getAttribute("aria-pressed")).toBe("true");
    expect(notReadyButton.className).toContain("bg-rose-600");
  });

  it("keeps lobby actions available with a large player list", () => {
    const basePlayers = createSnapshot().players;
    const players = [
      ...basePlayers,
      ...Array.from({ length: 48 }, (_, index) => ({
        ...basePlayers[1]!,
        id: `player-${index + 3}`,
        name: `Player ${index + 3}`,
      })),
    ];
    renderExperience(createClientState(createSnapshot({ players })));

    expect(screen.getByText("50 players")).toBeTruthy();
    expect(screen.getByText("Player 50")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Room players" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I'm not ready" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start game" })).toBeTruthy();
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

  it("copies the room code and shows join, disconnect, reconnect, and leave toasts with sounds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const playedSources: string[] = [];
    const playMock = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      src: string;
      volume = 1;
      constructor(src = "") {
        this.src = src;
        playedSources.push(src);
      }
      play = playMock;
    }
    vi.stubGlobal("Audio", MockAudio);

    const initialSnapshot = createSnapshot({
      players: [
        {
          ...createSnapshot().players[0]!,
          id: "player-1",
          name: "Ada",
        },
      ],
    });
    const client = {
      createRoom: mocks.createRoom.mockResolvedValue(undefined),
      joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
      joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
      setReady: mocks.setReady,
      setPaused: mocks.setPaused,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      submitCommand: mocks.submitCommand.mockResolvedValue(1),
      sendReaction: mocks.sendReaction,
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
      players: [
        ...initialSnapshot.players,
        {
          ...createSnapshot().players[1]!,
          id: "player-2",
          name: "Grace",
          connected: true,
        },
      ],
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
    expect(await screen.findByText(/joined the room/)).toBeTruthy();
    expect(playedSources).toContain("/audio/player-join.wav");

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
    expect(await screen.findByText(/disconnected/)).toBeTruthy();
    expect(playedSources).toContain("/audio/player-leave.wav");

    const reconnectedSnapshot = createSnapshot({
      revision: 4,
      players: joinedSnapshot.players,
    });
    mocks.useRoomClient.mockReturnValue({
      client,
      state: createClientState(reconnectedSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );
    expect(await screen.findByText(/reconnected to the room/)).toBeTruthy();

    const leftSnapshot = createSnapshot({
      revision: 5,
      players: initialSnapshot.players,
    });
    mocks.useRoomClient.mockReturnValue({
      client,
      state: createClientState(leftSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );
    expect(await screen.findByText(/left the room/)).toBeTruthy();
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

  it("renders power-ups during play, round recap on reveal, and sends emoji reactions", () => {
    const playingSnapshot = createSnapshot({
      status: "playing",
      config: {
        mode: "reverse",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "world",
        challengeValue: 0,
      },
      players: [
        {
          ...createSnapshot().players[0]!,
          powerUps: { fifty: true, hint: true, double: true, freeze: true },
          hint: 'Region: Americas · Starts with "C"',
        },
        {
          ...createSnapshot().players[1]!,
          answered: true,
          streak: 3,
        },
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Ottawa" },
          choices: [
            { id: "choice-canada", label: "Canada" },
            { id: "choice-france", label: "France" },
          ],
          revealed: false,
          answerReveal: null,
          startedAt: 1000,
          deadlineAt: 21000,
        },
      },
    });
    const view = renderExperience(createClientState(playingSnapshot));

    expect(screen.getByText(/Region: Americas/)).toBeTruthy();
    expect(screen.getByLabelText("Grace answered")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "50/50" }));
    expect(mocks.submitCommand).toHaveBeenCalledWith({
      type: "powerup",
      kind: "fifty",
    });

    const revealedSnapshot = createSnapshot({
      ...playingSnapshot,
      revision: 2,
      game: {
        ...playingSnapshot.game,
        round: {
          ...playingSnapshot.game.round!,
          revealed: true,
          answerReveal: { countryCode: "CAN", countryName: "Canada" },
          result: {
            fastestPlayerId: "player-2",
            closestPinPlayerId: "player-2",
            closestPinDistanceKm: 120,
            players: [
              {
                playerId: "player-2",
                correct: true,
                elapsedMs: 2400,
                pointsGained: 19,
                streakAfter: 3,
              },
            ],
          },
        },
      },
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(revealedSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(screen.getByLabelText("Round recap")).toBeTruthy();
    expect(screen.getByText("Answer: Canada")).toBeTruthy();
    expect(screen.getByText(/Fastest: Grace \(2\.4s\)/)).toBeTruthy();
    expect(screen.getByText(/3 in a row/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "React with 🔥" }));
    expect(mocks.sendReaction).toHaveBeenCalledWith("🔥");

    const countryPromptRevealedSnapshot = createSnapshot({
      ...revealedSnapshot,
      revision: 3,
      config: {
        mode: "identify",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "world",
        challengeValue: 0,
      },
      game: {
        ...revealedSnapshot.game,
        round: {
          ...revealedSnapshot.game.round!,
          prompt: { type: "text", value: "Armenia" },
          answerReveal: { countryCode: "ARM", countryName: "Armenia" },
        },
      },
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(countryPromptRevealedSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(screen.getByText("Armenia")).toBeTruthy();
    expect(screen.queryByText("Answer: Armenia")).toBeNull();
  });

  it("positions the player standings card at the bottom and closes it on mobile via the X button without closing on outside click", () => {
    const playingSnapshot = createSnapshot({
      status: "playing",
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Croatia" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    renderExperience(createClientState(playingSnapshot));

    const toggleButton = screen.getByRole("button", { name: "Toggle players" });
    const standings = screen.getByLabelText("Player standings");

    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(standings.className).toContain("hidden");
    expect(standings.className).toContain("left-3");
    expect(standings.className).toContain("md:bottom-6");
    expect(standings.className).toContain("z-10");

    fireEvent.click(toggleButton);
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
    expect(standings.className).toContain("block");

    // Clicking outside should NOT close the standings card
    fireEvent.click(screen.getByText("Croatia"));
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
    expect(standings.className).toContain("block");

    // Clicking the X button on the card closes it
    fireEvent.click(screen.getByRole("button", { name: "Close players" }));
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(standings.className).toContain("hidden");
  });

  it("marks AFK players in red in the standings list, notifies other players via toast, and keeps active players playing", async () => {
    const activeSnapshot = createSnapshot({
      status: "playing",
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
        },
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Croatia" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    const view = renderExperience(createClientState(activeSnapshot));

    const graceAfkSnapshot = createSnapshot({
      ...activeSnapshot,
      revision: 2,
      players: [
        activeSnapshot.players[0]!,
        {
          ...activeSnapshot.players[1]!,
          paused: true,
        },
      ],
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(graceAfkSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(await screen.findByText(/is AFK for the moment/)).toBeTruthy();
    expect(screen.getByLabelText("Grace AFK")).toBeTruthy();
    expect(screen.getByText("AFK")).toBeTruthy();
    // Ada keeps playing uninterrupted even with 1 active player
    expect(screen.getByText("Croatia")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Match paused" })).toBeNull();

    // When Ada herself is AFK/Spectating, she sees the Resume button
    const selfAfkSnapshot = createSnapshot({
      ...activeSnapshot,
      revision: 3,
      players: [
        {
          ...activeSnapshot.players[0]!,
          paused: true,
        },
        activeSnapshot.players[1]!,
      ],
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(selfAfkSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(screen.queryByText(/Spectating/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Resume playing" }));
    expect(mocks.setPaused).toHaveBeenCalledWith(false);

    // When spectatorPromptDeadlineAt is set, Ada sees the "Still spectating?" prompt with "Still watching" button
    const promptAfkSnapshot = createSnapshot({
      ...activeSnapshot,
      revision: 4,
      players: [
        {
          ...activeSnapshot.players[0]!,
          paused: true,
          spectatorPromptDeadlineAt: Date.now() + 25_000,
        },
        activeSnapshot.players[1]!,
      ],
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setReady: mocks.setReady,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(promptAfkSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(
      screen.getByRole("alert", { name: "Spectator inactivity check" }),
    ).toBeTruthy();
    expect(screen.getByText("Still spectating?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Still watching" }));
    expect(mocks.setPaused).toHaveBeenCalledWith(true);
  });

  it("places Reveal inline with the prompt, moves Change settings to the navbar, hides 'connected', and shows 'Leave'", async () => {
    const playingSnapshot = createSnapshot({
      status: "playing",
      players: [
        {
          ...createSnapshot().players[0]!,
          powerUps: { fifty: true, hint: true, double: true, freeze: true },
        },
        createSnapshot().players[1]!,
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "Croatia" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    renderExperience(createClientState(playingSnapshot));

    // "connected" status label is not rendered when connected
    expect(screen.queryByText(/^connected$/i)).toBeNull();

    // Navbar uses "Leave" instead of "Leave room"
    expect(screen.getByRole("button", { name: "Leave" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Leave room" })).toBeNull();

    // Skip button is removed; Reveal button sits on the same row as the prompt
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    const revealButton = screen.getByRole("button", { name: "Reveal" });
    fireEvent.click(revealButton);
    await waitFor(() =>
      expect(mocks.submitCommand).toHaveBeenCalledWith({ type: "reveal" }),
    );

    // Power-up buttons render icon and label on the same row
    expect(
      screen.getByRole("button", { name: "Hint" }).className,
    ).toContain("flex-row");

    // Admin Change settings button in the navbar opens the settings modal
    fireEvent.click(screen.getByRole("button", { name: "Change settings" }));
    expect(
      screen.getByRole("heading", { name: /next round settings/i }),
    ).toBeTruthy();
  });
});
