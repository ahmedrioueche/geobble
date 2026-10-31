// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryData } from "../../data/country-data";
import { useModalStore } from "../../store/modal";
import { useGameStore } from "../../store/useGameStore";
import { useAppActions } from "./hooks/useAppActions";

const { useCountryDataMock } = vi.hoisted(() => ({
  useCountryDataMock: vi.fn(),
}));

vi.mock("./hooks/useCountryData", () => ({
  useCountryData: useCountryDataMock,
}));

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

const setGameMode = (
  mode: "identify" | "reverse" | "pin",
  direction: "locate" | "identify" = "locate",
  subMode: "name" | "flag" | "capital" = "name",
) => {
  const store = useGameStore.getState();
  store.resetGame();
  store.setMode(mode);
  store.setPinDirection(direction);
  store.setSubMode(subMode);
  store.setChallenge("world", 0);
  useModalStore.getState().closeModal();
};

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
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  useGameStore.getState().resetGame();
  useModalStore.getState().closeModal();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useAppActions gameplay flows", () => {
  it("starts Identify, resolves a map answer, and advances to the next target", () => {
    setGameMode("identify");
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());

    expect(useGameStore.getState().currentCountryCode).toBe("CAN");
    expect(useGameStore.getState().totalQuestions).toBe(1);

    act(() => mounted.result.current.handleCountryClick("Canada", "CAN"));
    expect(useGameStore.getState().feedback).toBe("correct");
    expect(useGameStore.getState().score).toBe(10);

    act(() => vi.advanceTimersByTime(1200));
    expect(useGameStore.getState().currentCountryCode).toBe("USA");
    expect(useGameStore.getState().feedback).toBeNull();
    expect(useGameStore.getState().totalQuestions).toBe(2);
    mounted.unmount();
  });

  it("starts Reverse with generated choices and scores a correct flag answer", () => {
    setGameMode("reverse", "locate", "flag");
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());

    expect(mounted.result.current.choices).toHaveLength(4);
    expect(mounted.result.current.currentCountry?.cca3).toBe("CAN");

    act(() => mounted.result.current.handleChoiceSelect("CA"));

    expect(useGameStore.getState().feedback).toBe("correct");
    expect(useGameStore.getState().correctAttempts).toBe(1);
    expect(useGameStore.getState().score).toBe(10);
    mounted.unmount();
  });

  it("starts Pin Identify and resolves the target through its capital choice", () => {
    setGameMode("pin", "identify", "capital");
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());
    expect(mounted.result.current.currentCountry?.cca3).toBe("CAN");
    expect(mounted.result.current.choices).toContain("Ottawa");

    act(() => mounted.result.current.handleChoiceSelect("Ottawa"));

    expect(useGameStore.getState().feedback).toBe("correct");
    expect(useGameStore.getState().score).toBe(10);
    mounted.unmount();
  });

  it("stores a Pin Locate guess and reveals the target after a wrong country click", () => {
    setGameMode("pin", "locate");
    const mounted = renderHook(() => useAppActions());
    const guess: [number, number] = [-100, 50];

    act(() => mounted.result.current.handleFinalStart());
    act(() => mounted.result.current.handleCountryClick("France", "FRA", guess));

    expect(useGameStore.getState().pinLocation).toEqual(guess);
    expect(useGameStore.getState().feedback).toBe("wrong");
    expect(useGameStore.getState().revealed).toBe(true);
    expect(useGameStore.getState().totalAttempts).toBe(1);
    mounted.unmount();
  });

  it("handles reveal and skip through the public action handlers", () => {
    setGameMode("identify");
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());
    act(() => mounted.result.current.handleReveal());
    expect(useGameStore.getState().revealed).toBe(true);
    expect(useGameStore.getState().feedback).toBeNull();

    act(() => vi.advanceTimersByTime(2500));
    expect(useGameStore.getState().currentCountryCode).toBe("USA");

    act(() => mounted.result.current.skipQuestion());
    expect(useGameStore.getState().revealed).toBe(true);
    expect(useGameStore.getState().streak).toBe(0);
    expect(useGameStore.getState().totalAttempts).toBe(2);
    mounted.unmount();
  });

  it("finishes a one-question count mission and opens the result modal", () => {
    setGameMode("reverse");
    useGameStore.getState().setChallenge("count", 1);
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());
    const targetName = mounted.result.current.currentCountry?.name;
    expect(targetName).toBeDefined();
    act(() => mounted.result.current.handleChoiceSelect(targetName!));
    act(() => vi.advanceTimersByTime(1500));

    const state = useGameStore.getState();
    expect(state.gameStatus).toBe("finished");
    expect(useModalStore.getState().currentModal).toBe("result");
    expect(useModalStore.getState().resultProps?.correctAnswers).toBe(1);
    mounted.unmount();
  });

  it("finishes a timer mission after its countdown reaches zero", () => {
    setGameMode("reverse");
    useGameStore.getState().setChallenge("timer", 1);
    const mounted = renderHook(() => useAppActions());

    act(() => mounted.result.current.handleFinalStart());
    act(() => vi.advanceTimersByTime(2000));

    expect(useGameStore.getState().timeRemaining).toBe(0);
    expect(useGameStore.getState().gameStatus).toBe("finished");
    expect(useModalStore.getState().currentModal).toBe("result");
    mounted.unmount();
  });
});
