const ROOM_CODE_PATTERN = /^(?:\d{4,12}|[A-Z0-9]{6,12})$/;

/** Normalizes and validates a multiplayer room code. */
export const normalizeRoomCode = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(normalized) ? normalized : null;
};

/** Reads a valid room code from `?room=<code>` or `/room/<code>` in the current URL. */
export const readRoomIdFromLocation = (
  locationLike: Pick<Location, "search" | "pathname"> | undefined =
    typeof window !== "undefined" ? window.location : undefined,
): string | null => {
  if (!locationLike) return null;
  const params = new URLSearchParams(locationLike.search);
  const fromQuery = normalizeRoomCode(params.get("room"));
  if (fromQuery) return fromQuery;

  const pathMatch = locationLike.pathname.match(/^\/room\/([^/]+)\/?$/i);
  return normalizeRoomCode(pathMatch?.[1] ?? null);
};

/** Removes any deep-linked room identifier from the browser URL without reloading. */
export const clearRoomIdFromLocation = (): void => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;

  if (url.searchParams.has("room")) {
    url.searchParams.delete("room");
    changed = true;
  }
  if (/^\/room\/[^/]+\/?$/i.test(url.pathname)) {
    url.pathname = "/";
    changed = true;
  }

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", nextUrl || "/");
  }
};

/** Builds the shareable deep-link URL for a room. */
export const buildRoomShareUrl = (
  roomId: string,
  origin: string | undefined =
    typeof window !== "undefined" ? window.location.origin : undefined,
): string => {
  const base = origin || "https://geobble.app";
  const url = new URL("/", base);
  url.searchParams.set("room", roomId.trim().toUpperCase());
  return url.toString();
};

/** Formats a shareable invite message containing the link and optional private secret. */
export const buildRoomInviteMessage = (
  roomId: string,
  shareUrl: string,
  roomSecret?: string,
): string => {
  if (roomSecret) {
    return `Join my private Geobble room (${roomId}): ${shareUrl}\nRoom secret: ${roomSecret}`;
  }
  return `Join my Geobble room (${roomId}): ${shareUrl}`;
};

