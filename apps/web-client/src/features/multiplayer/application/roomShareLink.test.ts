// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  buildRoomInviteMessage,
  buildRoomShareUrl,
  clearRoomIdFromLocation,
  normalizeRoomCode,
  readRoomIdFromLocation,
} from "./roomShareLink";

describe("roomShareLink", () => {
  it("normalizes valid room codes and rejects invalid ones", () => {
    expect(normalizeRoomCode(" 4821 ")).toBe("4821");
    expect(normalizeRoomCode("ab23cd")).toBe("AB23CD");
    expect(normalizeRoomCode("12")).toBeNull();
    expect(normalizeRoomCode("not valid!")).toBeNull();
  });

  it("reads room ids from query strings and /room/:id paths", () => {
    expect(
      readRoomIdFromLocation({ search: "?room=4821", pathname: "/" }),
    ).toBe("4821");
    expect(
      readRoomIdFromLocation({ search: "", pathname: "/room/ab23cd" }),
    ).toBe("AB23CD");
    expect(
      readRoomIdFromLocation({ search: "?room=bad", pathname: "/" }),
    ).toBeNull();
  });

  it("builds shareable URLs and formatted invite messages", () => {
    const url = buildRoomShareUrl("4821", "https://geobble.app");
    expect(url).toBe("https://geobble.app/?room=4821");
    expect(buildRoomInviteMessage("4821", url)).toBe(
      "Join my Geobble room (4821): https://geobble.app/?room=4821",
    );
    expect(buildRoomInviteMessage("4821", url, "K7M9P2")).toBe(
      "Join my private Geobble room (4821): https://geobble.app/?room=4821\nRoom secret: K7M9P2",
    );
  });

  it("clears deep-linked room identifiers from window.location", () => {
    window.history.replaceState(null, "", "/?room=4821&foo=bar#top");
    clearRoomIdFromLocation();
    expect(window.location.search).toBe("?foo=bar");
    expect(window.location.hash).toBe("#top");

    window.history.replaceState(null, "", "/room/4821");
    clearRoomIdFromLocation();
    expect(window.location.pathname).toBe("/");
  });
});

