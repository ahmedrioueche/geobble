import { describe, expect, it } from "vitest";
import type { RoomConfiguration } from "../contracts/multiplayerRoomProtocol";
import { getRoomSettingsDiff } from "./roomSettingsDiff";

const baseConfig: RoomConfiguration = {
  mode: "identify",
  pinDirection: "locate",
  subMode: "name",
  challengeType: "count",
  challengeValue: 5,
  endless: true,
  difficulty: "progressive",
  roundTimeLimitSeconds: 20,
  speedScoring: true,
  wrongAnswerPenalty: 0,
};

describe("roomSettingsDiff", () => {
  it("returns empty diff when configs are equivalent after normalizing defaults", () => {
    expect(
      getRoomSettingsDiff(baseConfig, {
        mode: "identify",
        pinDirection: "identify",
        subMode: "name",
        challengeType: "count",
        challengeValue: 5,
      }),
    ).toEqual([]);
  });

  it("returns only changed entries with readable labels", () => {
    expect(
      getRoomSettingsDiff(baseConfig, {
        ...baseConfig,
        subMode: "flag",
        roundTimeLimitSeconds: 10,
      }),
    ).toEqual([
      {
        key: "prompt",
        label: "Prompt",
        from: "Country name",
        to: "Flag",
      },
      {
        key: "roundTimer",
        label: "Round timer",
        from: "20s",
        to: "10s",
      },
    ]);
  });
});

