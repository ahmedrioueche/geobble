import { describe, expect, it } from "vitest";
import {
  buildMultiplayerGameUi,
  buildMultiplayerMapState,
  resolveMultiplayerMapAnchor,
} from "./multiplayerMapAdapter";
import type { RoomSnapshot } from "../../../contracts/multiplayerRoomProtocol";

describe("multiplayerMapAdapter", () => {
  it("defaults to idle, identify, locate, and unrevealed when snapshot is null", () => {
    const mapState = buildMultiplayerMapState(null, null, null, null);
    expect(mapState).toEqual({
      gameStatus: "idle",
      mode: "identify",
      pinDirection: "locate",
      pinLocation: null,
      revealed: false,
    });
  });

  it("maps playing and finished gameStatus from snapshot", () => {
    const playingSnapshot = {
      status: "playing",
      config: { mode: "pin", pinDirection: "locate" },
    } as unknown as RoomSnapshot;
    expect(buildMultiplayerMapState(playingSnapshot, null, null, null).gameStatus).toBe("playing");

    const finishedSnapshot = {
      status: "finished",
      config: { mode: "pin", pinDirection: "locate" },
    } as unknown as RoomSnapshot;
    expect(buildMultiplayerMapState(finishedSnapshot, null, null, null).gameStatus).toBe("finished");
  });

  it("prioritizes selfPlayer.pinLocation over localPinGuess", () => {
    const self = {
      answered: true,
      pinLocation: [10, 20],
    } as unknown as RoomSnapshot["players"][number];
    const localGuess = {
      missionId: "m1",
      location: [30, 40] as [number, number],
    };
    const round = { missionId: "m1", revealed: false } as unknown as RoomSnapshot["game"]["round"];

    const state = buildMultiplayerMapState(null, round, self, localGuess);
    expect(state.pinLocation).toEqual([10, 20]);
  });

  it("falls back to localPinGuess when self.answered is true and missionId matches", () => {
    const self = {
      answered: true,
      pinLocation: null,
    } as unknown as RoomSnapshot["players"][number];
    const localGuess = {
      missionId: "m1",
      location: [30, 40] as [number, number],
    };
    const round = { missionId: "m1", revealed: false } as unknown as RoomSnapshot["game"]["round"];

    const state = buildMultiplayerMapState(null, round, self, localGuess);
    expect(state.pinLocation).toEqual([30, 40]);
  });

  it("resolves mapAnchor only for reverse mode or pin-identify mode", () => {
    const round = {
      prompt: { mapAnchor: { lat: 51.5, lng: -0.1 } },
    } as unknown as RoomSnapshot["game"]["round"];

    const reverseSnapshot = {
      config: { mode: "reverse" },
    } as unknown as RoomSnapshot;
    expect(resolveMultiplayerMapAnchor(reverseSnapshot, round)).toEqual({ lat: 51.5, lng: -0.1 });

    const pinIdentifySnapshot = {
      config: { mode: "pin", pinDirection: "identify" },
    } as unknown as RoomSnapshot;
    expect(resolveMultiplayerMapAnchor(pinIdentifySnapshot, round)).toEqual({ lat: 51.5, lng: -0.1 });

    const standardIdentify = {
      config: { mode: "identify" },
    } as unknown as RoomSnapshot;
    expect(resolveMultiplayerMapAnchor(standardIdentify, round)).toBeUndefined();
  });

  it("builds gameUi correctly based on lastAnswerResult", () => {
    expect(buildMultiplayerGameUi(null)).toEqual({
      feedback: null,
      clickedCode: null,
      clickedName: null,
    });
    expect(buildMultiplayerGameUi(true)).toEqual({
      feedback: "correct",
      clickedCode: null,
      clickedName: null,
    });
    expect(buildMultiplayerGameUi(false)).toEqual({
      feedback: "wrong",
      clickedCode: null,
      clickedName: null,
    });
  });
});
