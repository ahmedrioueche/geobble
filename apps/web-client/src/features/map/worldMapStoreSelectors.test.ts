// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "../../store/useGameStore";
import { useGameUiStore } from "../../store/useGameUiStore";
import { useShallow } from "zustand/react/shallow";
import { selectWorldMapSession, selectWorldMapUi } from "./worldMapStoreSelectors";

beforeEach(() => {
  useGameStore.getState().resetGame();
  useGameUiStore.getState().resetGameUi();
});

describe("WorldMap store selectors", () => {
  it("does not rerender for unrelated session changes but tracks map state", () => {
    const render = vi.fn();
    const mounted = renderHook(() => {
      const selected = useGameStore(useShallow(selectWorldMapSession));
      render();
      return selected;
    });
    const initialRenderCount = render.mock.calls.length;

    act(() => {
      useGameStore.getState().setScore(25);
      useGameStore.getState().setTimeRemaining(12);
    });
    expect(render).toHaveBeenCalledTimes(initialRenderCount);

    act(() => {
      useGameStore.getState().setPinLocation([10, 20]);
    });
    expect(render).toHaveBeenCalledTimes(initialRenderCount + 1);
    expect(mounted.result.current.pinLocation).toEqual([10, 20]);
    mounted.unmount();
  });

  it("does not rerender for unrelated UI changes but tracks map feedback", () => {
    const render = vi.fn();
    const mounted = renderHook(() => {
      const selected = useGameUiStore(useShallow(selectWorldMapUi));
      render();
      return selected;
    });
    const initialRenderCount = render.mock.calls.length;

    act(() => {
      useGameUiStore.getState().setStreakLost(3);
    });
    expect(render).toHaveBeenCalledTimes(initialRenderCount);

    act(() => {
      useGameUiStore.getState().setFeedback("wrong", "France", "FRA");
    });
    expect(render).toHaveBeenCalledTimes(initialRenderCount + 1);
    expect(mounted.result.current).toMatchObject({
      feedback: "wrong",
      clickedName: "France",
      clickedCode: "FRA",
    });
    mounted.unmount();
  });
});
