// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";
import { MultiplayerStandingsDrawer } from "./MultiplayerStandingsDrawer";

type RoomPlayer = RoomSnapshot["players"][number];

const createMockPlayer = (id: string, name: string, score: number): RoomPlayer => ({
  id,
  name,
  score,
  streak: 0,
  maxStreak: 0,
  connected: true,
  isAdmin: false,
  answered: false,
  pinLocation: null,
});

describe("MultiplayerStandingsDrawer", () => {
  afterEach(cleanup);
  it("renders the standings card expanded initially on desktop and shows player count", () => {
    const players = [
      createMockPlayer("p1", "Ada", 100),
      createMockPlayer("p2", "Grace", 80),
    ];

    render(
      <MultiplayerStandingsDrawer
        legNumber={1}
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        players={players}
        roundNumber={3}
        selfPlayerId="p1"
        showStandings={true}
        standingsScope="tour"
      />,
    );

    const standings = screen.getByLabelText("Player standings");
    expect(standings).toBeTruthy();
    expect(standings.className).toContain("h-auto");
    expect(standings.className).toContain("max-h-[50vh]");
    expect(standings.className).toContain("md:max-h-[60vh]");
    expect(screen.getByText("2 players")).toBeTruthy();
    expect(screen.getByText("Standings · Round 3")).toBeTruthy();
    expect(screen.getByText("Ada (you)")).toBeTruthy();
    expect(screen.getByText("Grace")).toBeTruthy();
  });

  it("can be collapsed on desktop into a single icon on the bottom left and reopened", () => {
    const players = [
      createMockPlayer("p1", "Ada", 100),
      createMockPlayer("p2", "Grace", 80),
    ];
    const onClose = vi.fn();

    render(
      <MultiplayerStandingsDrawer
        onClose={onClose}
        onScopeChange={vi.fn()}
        players={players}
        roundNumber={1}
        selfPlayerId="p1"
        showStandings={true}
        standingsScope="tour"
      />,
    );

    const standings = screen.getByLabelText("Player standings");
    expect(standings.className).toContain("md:block");

    // Click collapse / close button
    const closeBtn = screen.getByRole("button", { name: "Close players" });
    fireEvent.click(closeBtn);

    // Standings gets md:hidden on desktop
    expect(standings.className).toContain("md:hidden");

    // Bottom-left single icon toggle button appears
    const openBtn = screen.getByRole("button", { name: "Open players" });
    expect(openBtn.className).toContain("bottom-6");
    expect(openBtn.className).toContain("left-6");
    expect(openBtn.textContent).toContain("2"); // player count

    // Click to reopen
    fireEvent.click(openBtn);
    expect(standings.className).toContain("md:block");
    expect(screen.queryByRole("button", { name: "Open players" })).toBeNull();
  });

  it("handles hundreds of players in a scrollable list without layout breakage", () => {
    const hundredsOfPlayers: RoomPlayer[] = Array.from({ length: 150 }, (_, i) =>
      createMockPlayer(`p-${i}`, `Player ${i + 1}`, (150 - i) * 10),
    );

    render(
      <MultiplayerStandingsDrawer
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        players={hundredsOfPlayers}
        roundNumber={2}
        selfPlayerId="p-0"
        showStandings={true}
        standingsScope="tour"
      />,
    );

    expect(screen.getByText("150 players")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Tour standings" });
    expect(list.className).toContain("overflow-y-auto");
    expect(list.className).toContain("flex-1");

    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(150);
    expect(items[0].textContent).toContain("Player 1");
    expect(items[0].textContent).toContain("#1");
    expect(items[149].textContent).toContain("Player 150");
    expect(items[149].textContent).toContain("#150");
  });

  it("does not render a pinned top row when the player is in the top 5 (no duplication)", () => {
    const players: RoomPlayer[] = Array.from({ length: 8 }, (_, i) =>
      createMockPlayer(`p-${i}`, `Player ${i + 1}`, (8 - i) * 10),
    );

    render(
      <MultiplayerStandingsDrawer
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        players={players}
        roundNumber={1}
        selfPlayerId="p-2" // 3rd player (#3), within top 5
        showStandings={true}
        standingsScope="tour"
      />,
    );

    // No pinned jump button should exist because player is already in top 5
    expect(screen.queryByRole("button", { name: /^Jump to your position/ })).toBeNull();
  });

  it("renders a pinned top row when the player is ranked below top 5 and scrolls to their row on click", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const players: RoomPlayer[] = Array.from({ length: 20 }, (_, i) =>
      createMockPlayer(`p-${i}`, `Player ${i + 1}`, (20 - i) * 10),
    );

    render(
      <MultiplayerStandingsDrawer
        onClose={vi.fn()}
        onScopeChange={vi.fn()}
        players={players}
        roundNumber={1}
        selfPlayerId="p-11" // 12th player (#12)
        showStandings={true}
        standingsScope="tour"
      />,
    );

    // Pinned button must be rendered
    const jumpButton = screen.getByRole("button", { name: "Jump to your position #12" });
    expect(jumpButton).toBeTruthy();
    expect(jumpButton.textContent).toContain("You #12");
    expect(jumpButton.textContent).toContain("Player 12");
    expect(jumpButton.textContent).toContain("90"); // score

    // Clicking it triggers scrollIntoView
    fireEvent.click(jumpButton);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
  });
});
