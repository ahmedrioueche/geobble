// @vitest-environment jsdom

import {
  fireEvent,
  render,
  screen,
  act,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryData } from "./data/country-data";
import { GAME_SESSION_STORAGE_KEY } from "./store/gameSessionSnapshot";
import { useGameStore } from "./store/useGameStore";
import App from "./App";

const countries: CountryData[] = [
  {
    name: "Canada",
    officialName: "Canada",
    cca2: "CA",
    cca3: "CAN",
    ccn3: "124",
    capital: ["Ottawa"],
    region: "Americas",
    subregion: "North America",
    flag: "🇨🇦",
    population: 40000000,
  },
  {
    name: "United States",
    officialName: "United States of America",
    cca2: "US",
    cca3: "USA",
    ccn3: "840",
    capital: ["Washington, D.C."],
    region: "Americas",
    subregion: "North America",
    flag: "🇺🇸",
    population: 330000000,
  },
  {
    name: "France",
    officialName: "French Republic",
    cca2: "FR",
    cca3: "FRA",
    ccn3: "250",
    capital: ["Paris"],
    region: "Europe",
    subregion: "Western Europe",
    flag: "🇫🇷",
    population: 68000000,
  },
  {
    name: "Brazil",
    officialName: "Federative Republic of Brazil",
    cca2: "BR",
    cca3: "BRA",
    ccn3: "076",
    capital: ["Brasília"],
    region: "Americas",
    subregion: "South America",
    flag: "🇧🇷",
    population: 215000000,
  },
];

const { useCountryDataMock } = vi.hoisted(() => ({
  useCountryDataMock: vi.fn(),
}));

vi.mock("./features/game/hooks/useCountryData", () => ({
  useCountryData: useCountryDataMock,
}));

vi.mock("./components/organisms/LoadingScreen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("./features/game/components/GameHUD", () => ({
  GameHUD: ({ onStart }: { onStart: () => void }) => (
    <button onClick={onStart}>Open game menu</button>
  ),
}));

vi.mock("./features/game/components/TacticalInterface", () => ({
  TacticalInterface: ({
    currentCountry,
    onChoiceSelect,
  }: {
    currentCountry: CountryData | undefined;
    onChoiceSelect: (countryCode: string, value: string) => void;
  }) => (
    <button
      onClick={() => {
        if (currentCountry) {
          onChoiceSelect(currentCountry.cca3, currentCountry.cca2);
        }
      }}
    >
      Answer current target
    </button>
  ),
}));

vi.mock("./features/map/WorldMap", () => ({ WorldMap: () => null }));
vi.mock("./features/game/components/GlobalOverlays", () => ({
  GlobalOverlays: () => null,
}));
vi.mock("./modals", () => ({ default: () => null }));
vi.mock("./hooks/useFullscreen", () => ({
  useFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  useCountryDataMock.mockReturnValue({ countries, loading: false });
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal(
    "Audio",
    class {
      volume = 1;
      play = vi.fn().mockResolvedValue(undefined);
    },
  );
  useGameStore.getState().resetGame();
  useGameStore.getState().setMode("reverse");
  useGameStore.getState().setSubMode("flag");
  useGameStore.getState().setChallenge("world", 0);
});

afterEach(() => {
  cleanup();
  useGameStore.getState().resetGame();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("App saved-game resume flow", () => {
  const flushAsyncSessionWork = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("reloads an active game, resumes it from the mode menu, and continues the round", async () => {
    const firstRender = render(<App />);

    act(() => {
      window.dispatchEvent(new Event("game:start-mission"));
    });

    const firstTarget = useGameStore.getState().session.currentCountryCode;
    const firstSessionId = useGameStore.getState().session.id;
    expect(firstTarget).toBeDefined();
    expect(firstSessionId).toBeTruthy();
    useGameStore.getState().setScore(40);

    await flushAsyncSessionWork();
    expect(window.localStorage.getItem(GAME_SESSION_STORAGE_KEY)).not.toBeNull();
    const savedValue = window.localStorage.getItem(GAME_SESSION_STORAGE_KEY);
    expect(savedValue).not.toBeNull();
    expect(JSON.parse(savedValue!).id).toBe(firstSessionId);
    firstRender.unmount();

    useGameStore.getState().resetGame();
    const secondRender = render(<App />);
    await flushAsyncSessionWork();

    fireEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume saved game" }));

    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(useGameStore.getState().session.score).toBe(40);
    expect(useGameStore.getState().session.currentCountryCode).toBe(firstTarget);
    expect(useGameStore.getState().session.id).toBe(firstSessionId);

    fireEvent.click(screen.getByRole("button", { name: "Answer current target" }));
    expect(useGameStore.getState().session.correctAttempts).toBe(1);
    act(() => vi.advanceTimersByTime(1200));
    expect(useGameStore.getState().session.currentCountryCode).not.toBe(firstTarget);
    expect(useGameStore.getState().session.totalQuestions).toBe(2);
    secondRender.unmount();
  });

  it("keeps an active game playable and displays a save error when storage is full", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let storageAvailable = false;
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (!storageAvailable) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      originalSetItem.call(this, key, value);
    });

    render(<App />);
    act(() => {
      window.dispatchEvent(new Event("game:start-mission"));
    });

    await flushAsyncSessionWork();

    expect(useGameStore.getState().session.gameStatus).toBe("playing");

    fireEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Your game could not be saved on this device.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Answer current target" }));
    expect(useGameStore.getState().session.correctAttempts).toBe(1);

    storageAvailable = true;
    fireEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));

    await flushAsyncSessionWork();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Resume saved game" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume saved game" }));
    expect(useGameStore.getState().session.gameStatus).toBe("playing");
    expect(useGameStore.getState().session.correctAttempts).toBe(1);
  });
});
