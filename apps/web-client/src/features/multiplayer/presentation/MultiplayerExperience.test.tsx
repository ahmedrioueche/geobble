// @vitest-environment jsdom

import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import type { RoomSnapshot } from "../contracts/multiplayerRoomProtocol";
import {
  RoomRequestFailure,
  type RoomClientState,
} from "../application/multiplayerRoomClient";
import { MultiplayerExperience } from "./MultiplayerExperience";

const mocks = vi.hoisted(() => ({
  useRoomClient: vi.fn(),
  playOffline: vi.fn(),
  setPaused: vi.fn(),
  startRoom: vi.fn(),
  submitCommand: vi.fn(),
  sendReaction: vi.fn(),
  inspectRoom: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  joinPublicRoom: vi.fn(),
  leaveRoom: vi.fn(),
  changeSettings: vi.fn(),
  proposeSettings: vi.fn(),
  voteSettings: vi.fn(),
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

const createClientState = (snapshot?: RoomSnapshot): RoomClientState => ({
  status: snapshot ? "connected" : "disconnected",
  room: snapshot ? { playerId: "player-1", snapshot } : null,
  pendingCommandIds: [],
  lastAcknowledgedRevision: null,
  lastAnswerResult: null,
  settingsAccepted: null,
  lastVoteResolved: null,
  lastReaction: null,
  error: null,
  reconnectAvailable: false,
  reconnectRequired: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
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
      inspectRoom: mocks.inspectRoom.mockResolvedValue({
        requestId: "inspect-1",
        roomId: "ROOM2345",
        visibility: "public",
        status: "waiting",
        playerCount: 1,
        maxPlayers: 8,
        requiresSecret: false,
      }),
      createRoom: mocks.createRoom.mockResolvedValue(undefined),
      joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
      joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
      setPaused: mocks.setPaused,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      proposeSettings: mocks.proposeSettings.mockResolvedValue(undefined),
      voteSettings: mocks.voteSettings.mockResolvedValue(undefined),
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
  toast.remove();
  cleanup();
});

describe("MultiplayerExperience", () => {
  const renderExperience = (state: RoomClientState = createClientState()) => {
    mocks.useRoomClient.mockReturnValue({
      client: {
        inspectRoom: mocks.inspectRoom,
        createRoom: mocks.createRoom.mockResolvedValue(undefined),
        joinRoom: mocks.joinRoom.mockResolvedValue(undefined),
        joinPublicRoom: mocks.joinPublicRoom.mockResolvedValue(undefined),
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        proposeSettings: mocks.proposeSettings.mockResolvedValue(undefined),
        voteSettings: mocks.voteSettings.mockResolvedValue(undefined),
        submitCommand: mocks.submitCommand.mockResolvedValue(1),
        sendReaction: mocks.sendReaction,
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

  it("creates a public room by default from the room entry page", async () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create public room" }),
    );

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith(
        "Ada",
        undefined,
        "public",
      ),
    );
  });

  it("can switch visibility and create a private room", async () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^private$/i }));
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

  it("selects cards on click/tap and highlights the corresponding action button", () => {
    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));

    const joinPublicBtn = screen.getByRole("button", { name: "Join public game" });
    const createRoomBtn = screen.getByRole("button", { name: "Create public room" });
    const joinCodeBtn = screen.getByRole("button", { name: "Join room" });

    // Initially, create room card is active
    expect(createRoomBtn.className).toContain("text-slate-950");
    expect(joinPublicBtn.className).toContain("bg-slate-800/80");

    // Click "Join a public game" card
    const joinPublicCard = screen.getByText("Join a public game").closest("article")!;
    fireEvent.click(joinPublicCard);

    // Join public game is now selected and highlighted
    expect(joinPublicBtn.className).toContain("text-slate-950");
    expect(createRoomBtn.className).toContain("bg-slate-800/80");
    expect(joinPublicCard.getAttribute("aria-selected")).toBe("true");

    // Simulating mouseleave or touch move does NOT revert to create
    fireEvent.mouseLeave(joinPublicCard);
    expect(joinPublicBtn.className).toContain("text-slate-950");

    // Click "Join with a code" card
    const joinCodeCard = screen.getByText("Join with a code").closest("article")!;
    fireEvent.click(joinCodeCard);
    expect(joinCodeBtn.className).toContain("text-slate-950");
    expect(joinPublicBtn.className).toContain("bg-slate-800/80");
    expect(joinCodeCard.getAttribute("aria-selected")).toBe("true");
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
      screen.getByRole("button", { name: "Create public room" }),
    );

    await waitFor(() =>
      expect(mocks.createRoom).toHaveBeenCalledWith(
        "Ada",
        undefined,
        "public",
      ),
    );
  });

  it("allows the admin to start immediately when 2+ connected players are present without ready checks", () => {
    const snapshot = createSnapshot();
    renderExperience(createClientState(snapshot));

    expect(screen.getByRole("region", { name: "Room settings" })).toBeTruthy();
    expect(screen.getByText("Whole world (endless)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /ready/i })).toBeNull();
    expect(
      screen.queryByText(/Click Start game to begin immediately/i),
    ).toBeNull();
    expect(
      screen.queryByRole("progressbar", { name: /waiting for the host/i }),
    ).toBeNull();

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

    expect(mocks.startRoom).toHaveBeenCalledOnce();
  });

  it("disables start game until at least 2 connected players are in the lobby", () => {
    const singlePlayerSnapshot = createSnapshot({
      players: [createSnapshot().players[0]!],
    });
    const view = renderExperience(createClientState(singlePlayerSnapshot));
    const startButton = screen.getByRole("button", {
      name: "Start game",
    }) as HTMLButtonElement;

    expect(startButton.disabled).toBe(true);
    expect(
      screen.getByText("Waiting for another player to join."),
    ).toBeTruthy();

    const twoPlayersSnapshot = createSnapshot();
    mocks.useRoomClient.mockReturnValue({
      client: {
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(twoPlayersSnapshot),
    });
    view.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Start game" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      screen.getByText("Match can start whenever you want."),
    ).toBeTruthy();
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
    expect(screen.getByText("Waiting for the host to start")).toBeTruthy();
    expect(
      screen.queryByText(/The match begins as soon as the host/i),
    ).toBeNull();
    expect(
      screen.getByRole("progressbar", { name: "Waiting for the host to start" }),
    ).toBeTruthy();
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
      setPaused: mocks.setPaused,
      startRoom: mocks.startRoom,
      changeSettings: mocks.changeSettings,
      proposeSettings: mocks.proposeSettings.mockResolvedValue(undefined),
      voteSettings: mocks.voteSettings.mockResolvedValue(undefined),
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
    const dialog = screen.getByRole("dialog", { name: /next round settings/i });
    expect(dialog.className).toContain("h-[100dvh]");
    expect(dialog.className).toContain("md:max-h-[calc(100dvh-2rem)]");
    expect(dialog.parentElement?.className).toContain("items-end");
  });

  it("auto-dismisses error messages after 5 seconds", () => {
    vi.useFakeTimers();
    try {
      renderExperience({
        ...createClientState(),
        status: "error",
        error: "This room was closed due to inactivity.",
      });

      expect(screen.getByRole("alert").textContent).toBe(
        "This room was closed due to inactivity.",
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles shareable links for public rooms without requiring a secret", async () => {
    window.localStorage.setItem("geobble:multiplayer-player-name", "Ada");
    window.history.replaceState(null, "", "/?room=4821");
    mocks.inspectRoom.mockResolvedValueOnce({
      requestId: "inspect-pub",
      roomId: "4821",
      visibility: "public",
      status: "waiting",
      playerCount: 2,
      maxPlayers: 8,
      requiresSecret: false,
    });

    renderExperience();

    await waitFor(() => expect(mocks.inspectRoom).toHaveBeenCalledWith("4821"));
    expect(await screen.findByText(/^public room$/i)).toBeTruthy();
    expect(screen.queryByLabelText("Room secret")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Join public room" }));
    await waitFor(() => expect(mocks.joinRoom).toHaveBeenCalledWith("4821", "Ada"));
  });

  it("requires the room secret when opening a shareable link for a private room", async () => {
    window.localStorage.setItem("geobble:multiplayer-player-name", "Grace");
    window.history.replaceState(null, "", "/?room=9012");
    mocks.inspectRoom.mockResolvedValueOnce({
      requestId: "inspect-priv",
      roomId: "9012",
      visibility: "private",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 8,
      requiresSecret: true,
    });

    renderExperience();

    await waitFor(() => expect(mocks.inspectRoom).toHaveBeenCalledWith("9012"));
    expect(await screen.findByText(/^private room$/i)).toBeTruthy();

    const submitButton = screen.getByRole("button", {
      name: "Join private room",
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Room secret"), {
      target: { value: "K7M9P2" },
    });
    expect(submitButton.disabled).toBe(false);

    fireEvent.click(submitButton);
    await waitFor(() =>
      expect(mocks.joinRoom).toHaveBeenCalledWith("9012", "Grace", "K7M9P2"),
    );
  });

  it("shows an error when a linked room is missing and clears the URL on fallback", async () => {
    window.history.replaceState(null, "", "/?room=9999");
    mocks.inspectRoom.mockRejectedValueOnce(
      new RoomRequestFailure("That room could not be found.", "ROOM_NOT_FOUND"),
    );

    renderExperience();

    expect(
      await screen.findByText("That room could not be found."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Open multiplayer menu" }),
    );

    expect(window.location.search).toBe("");
    expect(
      screen.getByRole("region", { name: "Multiplayer room options" }),
    ).toBeTruthy();
  });

  it("renders shareable link and private secret controls in the header popover and waiting lobby", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const state = createClientState(createSnapshot({ visibility: "private" }));
    state.room = {
      ...state.room!,
      roomSecret: "SECRET7",
    };

    renderExperience(state);

    // Waiting lobby invite card copies link and secret
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("/?room=ROOM2345"),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("SECRET7"),
    );

    // Header Share button opens popover
    fireEvent.click(screen.getByRole("button", { name: "Share room" }));
    expect(
      screen.getByRole("dialog", { name: "Room share options" }),
    ).toBeTruthy();
  });

  it("prompts for room secret inline when manually joining a private room by code", async () => {
    mocks.joinRoom.mockRejectedValueOnce(
      new RoomRequestFailure(
        "This private room requires a room secret.",
        "SECRET_REQUIRED",
      ),
    );

    renderExperience();

    fireEvent.click(screen.getByRole("button", { name: "Multiplayer" }));
    fireEvent.change(screen.getByLabelText("Player name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Room code"), {
      target: { value: "4821" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join room" }));

    const secretInput = await screen.findByLabelText("Room secret");
    expect(secretInput).toBeTruthy();

    mocks.joinRoom.mockResolvedValueOnce(undefined);
    fireEvent.change(secretInput, { target: { value: "PASS42" } });
    fireEvent.click(screen.getByRole("button", { name: "Join room" }));

    await waitFor(() =>
      expect(mocks.joinRoom).toHaveBeenLastCalledWith("4821", "Ada", "PASS42"),
    );
  });

  it("completes room inspection cleanly under React StrictMode", async () => {
    window.history.replaceState(null, "", "/?room=4821");
    mocks.inspectRoom.mockResolvedValue({
      requestId: "inspect-strict",
      roomId: "4821",
      visibility: "public",
      status: "waiting",
      playerCount: 1,
      maxPlayers: 8,
      requiresSecret: false,
    });

    render(
      <StrictMode>
        <MultiplayerExperience
          countries={[]}
          onPlayOffline={mocks.playOffline}
          showHomeActions
        />
      </StrictMode>,
    );

    expect(await screen.findByText(/^public room$/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Join public room" }),
    ).toBeTruthy();
  });

  it("renders flag images for flag prompts and falls back to emoji if loading fails", () => {
    const snapshot = createSnapshot({
      status: "playing",
      config: {
        mode: "identify",
        pinDirection: "locate",
        subMode: "flag",
        challengeType: "world",
        challengeValue: 0,
      },
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-flag-1",
          number: 1,
          prompt: { type: "flag", value: "🇨🇦", flagCode: "ca" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });

    renderExperience(createClientState(snapshot));

    const flagImg = screen.getByRole("img", { name: "Target flag" });
    expect(flagImg.getAttribute("src")).toBe("https://flagcdn.com/w160/ca.png");

    fireEvent.error(flagImg);
    expect(screen.getByText("🇨🇦")).toBeTruthy();
  });

  it("renders flag images for reverse flag choices and submits the selected choice", async () => {
    mocks.submitCommand.mockResolvedValue(1);
    const snapshot = createSnapshot({
      status: "playing",
      config: {
        mode: "reverse",
        pinDirection: "locate",
        subMode: "flag",
        challengeType: "count",
        challengeValue: 5,
      },
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-flag-2",
          number: 1,
          prompt: {
            type: "instruction",
            value: "Identify the highlighted country",
          },
          choices: [
            { id: "choice-ca", label: "🇨🇦", flagCode: "ca" },
            { id: "choice-fr", label: "🇫🇷", flagCode: "fr" },
          ],
          revealed: false,
          answerReveal: null,
        },
      },
    });

    renderExperience(createClientState(snapshot));

    const choiceImages = screen.getAllByRole("img", { name: "Flag choice" });
    expect(choiceImages).toHaveLength(2);
    expect(choiceImages[0]?.getAttribute("src")).toBe(
      "https://flagcdn.com/w80/ca.png",
    );
    expect(choiceImages[1]?.getAttribute("src")).toBe(
      "https://flagcdn.com/w80/fr.png",
    );

    fireEvent.click(choiceImages[1]!);
    await waitFor(() =>
      expect(mocks.submitCommand).toHaveBeenCalledWith({
        type: "answer",
        answerCountryCode: null,
        choiceId: "choice-fr",
      }),
    );
  });

  it("renders final standings on match end and lets the host edit settings or start a rematch", async () => {
    const finishedSnapshot = createSnapshot({
      status: "finished",
      config: {
        mode: "identify",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "count",
        challengeValue: 5,
      },
      players: [
        {
          id: "player-1",
          name: "Ada",
          isAdmin: true,
          connected: true,
          score: 30,
          streak: 0,
          maxStreak: 2,
          pinLocation: null,
          answered: true,
        },
        {
          id: "player-2",
          name: "Grace",
          isAdmin: false,
          connected: true,
          score: 55,
          streak: 3,
          maxStreak: 3,
          pinLocation: null,
          answered: true,
        },
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-final",
          number: 5,
          prompt: { type: "text", value: "France" },
          choices: [],
          revealed: true,
          answerReveal: { countryCode: "FRA", countryName: "France" },
        },
      },
    });

    renderExperience(createClientState(finishedSnapshot));

    expect(screen.getByRole("heading", { name: "Grace wins!" })).toBeTruthy();
    const standings = screen.getByRole("list", { name: "Final standings" });
    const items = standings.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain("Grace");
    expect(items[0]?.textContent).toContain("55 pts");
    expect(items[0]?.textContent).toContain("Best streak: 3");
    expect(items[1]?.textContent).toContain("Ada");

    fireEvent.click(screen.getByRole("button", { name: "React with 🔥" }));
    expect(mocks.sendReaction).toHaveBeenCalledWith("🔥");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("heading", { name: "Room settings" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const playAgainBtn = screen.getByRole("button", { name: "Play again" });
    expect((playAgainBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(playAgainBtn);

    expect(mocks.startRoom).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Starting rematch…")).toBeTruthy();
  });

  it("disables Play again when fewer than 2 connected players remain and shows waiting UI to guests", () => {
    const soloFinishedSnapshot = createSnapshot({
      status: "finished",
      players: [
        {
          id: "player-1",
          name: "Ada",
          isAdmin: true,
          connected: true,
          score: 20,
          streak: 1,
          maxStreak: 1,
          pinLocation: null,
          answered: true,
        },
        {
          id: "player-2",
          name: "Grace",
          isAdmin: false,
          connected: false,
          score: 10,
          streak: 0,
          maxStreak: 1,
          pinLocation: null,
          answered: false,
        },
      ],
    });

    renderExperience(createClientState(soloFinishedSnapshot));
    const playAgainBtn = screen.getByRole("button", {
      name: "Play again",
    }) as HTMLButtonElement;
    expect(playAgainBtn.disabled).toBe(true);
    expect(
      screen.getByText(
        "Waiting for another player to join to start a rematch.",
      ),
    ).toBeTruthy();

    cleanup();

    const guestViewSnapshot = createSnapshot({
      status: "finished",
    });
    const guestState = createClientState(guestViewSnapshot);
    guestState.room = { playerId: "player-2", snapshot: guestViewSnapshot };

    renderExperience(guestState);
    expect(
      screen.queryByRole("button", { name: "Play again" }),
    ).toBeNull();
    expect(
      screen.getByText("Waiting for Ada to start a rematch…"),
    ).toBeTruthy();
  });

  it("renders endless checkpoint leaderboards, countdown, and host controls to pause or start next leg", async () => {
    const checkpointSnapshot = createSnapshot({
      status: "checkpoint",
      config: {
        mode: "identify",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "count",
        challengeValue: 10,
        endless: true,
      },
      players: [
        {
          id: "player-1",
          name: "Ada",
          isAdmin: true,
          connected: true,
          score: 85,
          legScore: 30,
          checkpointsWon: 1,
          streak: 2,
          maxStreak: 4,
          pinLocation: null,
          answered: true,
        },
        {
          id: "player-2",
          name: "Grace",
          isAdmin: false,
          connected: true,
          score: 70,
          legScore: 45,
          checkpointsWon: 1,
          streak: 3,
          maxStreak: 3,
          pinLocation: null,
          answered: true,
        },
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        legNumber: 2,
        legRoundNumber: 10,
        lapNumber: 1,
        legMultiplier: 1.25,
        legTier: "medium",
        checkpointResumeAt: Date.now() + 8_000,
        checkpointPaused: false,
        checkpointSummary: {
          legNumber: 2,
          roundsInLeg: 10,
          winnerIds: ["player-2"],
          topLegScore: 45,
          nextLegNumber: 3,
          nextLegTier: "hard",
          nextLegMultiplier: 1.5,
          lapNumber: 1,
        },
        round: null,
      },
    });

    renderExperience(createClientState(checkpointSnapshot));

    const checkpointRegion = screen.getByLabelText("Checkpoint summary");
    expect(checkpointRegion.className).toContain("inset-x-0");
    expect(checkpointRegion.className).toContain("bottom-0");
    expect(checkpointRegion.className).toContain("overflow-x-hidden");

    expect(
      screen.getByRole("heading", { name: "Grace takes Leg 2!" }),
    ).toBeTruthy();
    expect(screen.getByText("Up next: Leg 3")).toBeTruthy();
    expect(screen.getByText("1.5x pts")).toBeTruthy();

    // Leg standings show Grace first (45 pts)
    const legList = screen.getByRole("list", { name: "Leg standings" });
    expect(legList.querySelectorAll("li")[0]?.textContent).toContain("Grace");
    expect(legList.querySelectorAll("li")[0]?.textContent).toContain("45 pts");

    // Switch to Tour total standings -> Ada first (85 pts) with crown
    fireEvent.click(screen.getByRole("tab", { name: /Tour total/i }));
    const tourList = screen.getByRole("list", { name: "Tour standings" });
    expect(tourList.querySelectorAll("li")[0]?.textContent).toContain("Ada");
    expect(tourList.querySelectorAll("li")[0]?.textContent).toContain("85 pts");
    expect(tourList.querySelectorAll("li")[0]?.textContent).toContain("👑1");

    // Host can pause countdown and start next leg immediately
    fireEvent.click(screen.getByRole("button", { name: "Pause countdown" }));
    expect(mocks.setPaused).toHaveBeenCalledWith(true);

    fireEvent.click(
      screen.getByRole("button", { name: "Start next leg now" }),
    );
    expect(mocks.startRoom).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Starting next leg…")).toBeTruthy();
  });

  it("shows leg multiplier and Leg/Tour standings toggle during active endless play", () => {
    const leg2PlayingSnapshot = createSnapshot({
      status: "playing",
      config: {
        mode: "identify",
        pinDirection: "locate",
        subMode: "name",
        challengeType: "count",
        challengeValue: 10,
        endless: true,
      },
      players: [
        {
          id: "player-1",
          name: "Ada",
          isAdmin: true,
          connected: true,
          score: 100,
          legScore: 15,
          checkpointsWon: 1,
          streak: 1,
          maxStreak: 3,
          pinLocation: null,
          answered: false,
        },
        {
          id: "player-2",
          name: "Grace",
          isAdmin: false,
          connected: true,
          score: 75,
          legScore: 30,
          checkpointsWon: 2,
          streak: 2,
          maxStreak: 2,
          pinLocation: null,
          answered: false,
        },
      ],
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        legNumber: 2,
        legRoundNumber: 3,
        lapNumber: 1,
        legMultiplier: 1.25,
        legTier: "medium",
        round: {
          missionId: "mission-leg2-3",
          number: 13,
          difficultyTier: "medium",
          prompt: { type: "text", value: "Austria" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });

    renderExperience(createClientState(leg2PlayingSnapshot));

    expect(screen.getByText(/Leg 2 · identify · medium/i)).toBeTruthy();
    expect(screen.getByText("1.25x")).toBeTruthy();
    expect(screen.getByText("3 / 10")).toBeTruthy();

    const standingsAside = screen.getByLabelText("Player standings");
    expect(standingsAside.className).toContain("md:w-80");

    fireEvent.click(screen.getByRole("button", { name: "Leg" }));
    const items = standingsAside.querySelectorAll("li");
    expect(items[0]?.className).toContain("text-sm");
    expect(items[0]?.textContent).toContain("Grace");
    expect(items[0]?.textContent).toContain("2 wins");
    expect(items[1]?.textContent).toContain("Ada");
    expect(items[1]?.textContent).toContain("1 win");
  });

  it("handles 2-player Accept/Decline and 3+ player majority votes across all screens with mobile visibility and host vote option", async () => {
    // 1. Waiting room: non-host sees Propose button, unchanged form disables submit, changing a setting submits proposeSettings
    const waitingNonHostSnapshot = createSnapshot({
      status: "waiting",
    });
    renderExperience({
      ...createClientState(waitingNonHostSnapshot),
      room: { playerId: "player-2", snapshot: waitingNonHostSnapshot },
    });

    expect(
      screen.getByRole("button", { name: "Propose change" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Propose" }));
    expect(screen.getByText(/Propose settings vote/i)).toBeTruthy();
    const submitProposal = screen.getByRole("button", {
      name: "Propose vote",
    }) as HTMLButtonElement;
    expect(submitProposal.disabled).toBe(true);

    // Change prompt to Flag via CustomSelect inside the modal
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Prompt" }));
    fireEvent.click(dialog.getByRole("option", { name: "Flag" }));
    expect(submitProposal.disabled).toBe(false);
    fireEvent.click(submitProposal);

    await waitFor(() => {
      expect(mocks.proposeSettings).toHaveBeenCalledWith(
        expect.objectContaining({ subMode: "flag" }),
      );
    });

    cleanup();

    // 2. Playing screen: non-host sees labeled Propose button on mobile too (no hidden class)
    const playingInitialSnapshot = createSnapshot({
      status: "playing",
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        round: {
          missionId: "mission-1",
          number: 1,
          prompt: { type: "text", value: "France" },
          choices: [],
          revealed: false,
          answerReveal: null,
        },
      },
    });
    const hostView = renderExperience(createClientState(playingInitialSnapshot));

    // Host sees "Put to vote" inside settings modal when 2+ eligible players exist
    fireEvent.click(screen.getByRole("button", { name: "Change settings" }));
    const hostDialog = within(screen.getByRole("dialog"));
    fireEvent.click(hostDialog.getByRole("button", { name: "Prompt" }));
    fireEvent.click(hostDialog.getByRole("option", { name: "Flag" }));
    fireEvent.click(hostDialog.getByRole("button", { name: "Put to vote" }));
    await waitFor(() => {
      expect(mocks.proposeSettings).toHaveBeenCalledWith(
        expect.objectContaining({ subMode: "flag" }),
      );
    });

    // When Grace starts a 2-player vote, Admin on mobile gets notified by toast and sees Accept / Decline
    const playingWithTwoPlayerVoteSnapshot = createSnapshot({
      ...playingInitialSnapshot,
      revision: 2,
      settingsVote: {
        voteId: "vote-playing-1",
        proposerPlayerId: "player-2",
        proposerName: "Grace",
        proposedConfig: {
          mode: "identify",
          pinDirection: "locate",
          subMode: "flag",
          challengeType: "world",
          challengeValue: 0,
        },
        yesPlayerIds: ["player-2"],
        noPlayerIds: [],
        requiredYes: 2,
        eligibleCount: 2,
        createdAt: 1000,
        expiresAt: 26000,
      },
    });
    mocks.useRoomClient.mockReturnValue({
      client: {
        inspectRoom: mocks.inspectRoom,
        createRoom: mocks.createRoom,
        joinRoom: mocks.joinRoom,
        joinPublicRoom: mocks.joinPublicRoom,
        setPaused: mocks.setPaused,
        startRoom: mocks.startRoom,
        changeSettings: mocks.changeSettings,
        proposeSettings: mocks.proposeSettings,
        voteSettings: mocks.voteSettings.mockResolvedValue(undefined),
        submitCommand: mocks.submitCommand,
        sendReaction: mocks.sendReaction,
        leaveRoom: mocks.leaveRoom,
        forgetReconnect: mocks.forgetReconnect,
        retryReconnect: mocks.retryReconnect,
      },
      state: createClientState(playingWithTwoPlayerVoteSnapshot),
    });
    hostView.rerender(
      <MultiplayerExperience
        countries={[]}
        onPlayOffline={mocks.playOffline}
        showHomeActions
      />,
    );

    expect(
      await screen.findByText(/wants to change Prompt: Flag/i),
    ).toBeTruthy();

    const region = screen.getByRole("region", { name: "Settings vote" });
    expect(region.textContent).toContain("Grace wants to change settings");
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => {
      expect(mocks.voteSettings).toHaveBeenCalledWith("vote-playing-1", true);
    });

    cleanup();

    // 3. Proposer during playing sees auto-collapsed compact pill with "Waiting for Ada"
    renderExperience({
      ...createClientState(playingWithTwoPlayerVoteSnapshot),
      room: { playerId: "player-2", snapshot: playingWithTwoPlayerVoteSnapshot },
    });
    const expandButton = screen.getByRole("button", {
      name: "Expand settings vote",
    });
    expect(expandButton.textContent).toContain("Waiting for Ada");

    cleanup();

    // 4. Navbar Propose and Leave buttons are icon-only on mobile and labeled on desktop
    renderExperience({
      ...createClientState(playingInitialSnapshot),
      room: { playerId: "player-2", snapshot: playingInitialSnapshot },
    });
    const proposeNavbarBtn = screen.getByRole("button", {
      name: "Propose settings change",
    });
    expect(proposeNavbarBtn.querySelector("span")?.className ?? "").toContain(
      "hidden",
    );
    expect(proposeNavbarBtn.querySelector("span")?.className ?? "").toContain(
      "md:inline",
    );
    const leaveNavbarBtn = screen.getByRole("button", { name: "Leave" });
    expect(leaveNavbarBtn.querySelector("span")?.className ?? "").toContain(
      "hidden",
    );
    expect(leaveNavbarBtn.querySelector("span")?.className ?? "").toContain(
      "md:inline",
    );

    cleanup();

    // 5. 3-player Checkpoint & Finished screens show Yes/No majority vote pinned once cleanly
    const threePlayerCheckpointSnapshot = createSnapshot({
      status: "checkpoint",
      players: [
        ...createSnapshot().players,
        {
          id: "player-3",
          name: "Alan",
          isAdmin: false,
          connected: true,
          score: 0,
          streak: 0,
          maxStreak: 0,
          pinLocation: null,
          answered: false,
        },
      ],
      settingsVote: {
        ...playingWithTwoPlayerVoteSnapshot.settingsVote!,
        eligibleCount: 3,
      },
      game: {
        startedAt: 1,
        timerDeadlineAt: null,
        legNumber: 1,
        checkpointResumeAt: 20_000,
        checkpointSummary: {
          legNumber: 1,
          roundsInLeg: 2,
          winnerIds: ["player-1"],
          topLegScore: 20,
          nextLegNumber: 2,
          nextLegTier: "medium",
          nextLegMultiplier: 1.25,
          lapNumber: 1,
        },
        round: null,
      },
    });
    renderExperience(createClientState(threePlayerCheckpointSnapshot));
    expect(screen.getAllByRole("region", { name: "Settings vote" })).toHaveLength(
      1,
    );
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No" })).toBeTruthy();

    cleanup();

    const finishedVoteSnapshot = createSnapshot({
      status: "finished",
      settingsVote: playingWithTwoPlayerVoteSnapshot.settingsVote,
    });
    renderExperience({
      ...createClientState(finishedVoteSnapshot),
      room: { playerId: "player-2", snapshot: finishedVoteSnapshot },
    });
    expect(screen.getAllByRole("region", { name: "Settings vote" })).toHaveLength(
      1,
    );
    expect(
      screen.getAllByRole("button", { name: "Vote active" }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
