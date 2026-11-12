import { useEffect, useRef, useState } from "react";
import type React from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Link2,
  Lock,
  Share2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  buildRoomInviteMessage,
  buildRoomShareUrl,
} from "../application/roomShareLink";

interface RoomShareProps {
  roomId: string;
  visibility: "public" | "private";
  roomSecret?: string;
  onCopyCode: () => void;
}

const copyText = async (value: string, successMessage: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error("Could not copy to clipboard. Please copy it manually.");
    return false;
  }
};

const supportsNativeShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

const triggerNativeShare = async (
  roomId: string,
  shareUrl: string,
  roomSecret?: string,
) => {
  if (!supportsNativeShare()) return;
  try {
    await navigator.share({
      title: `Join Geobble Room ${roomId}`,
      text: buildRoomInviteMessage(roomId, shareUrl, roomSecret),
      url: shareUrl,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    await copyText(
      buildRoomInviteMessage(roomId, shareUrl, roomSecret),
      "Invite details copied",
    );
  }
};

const VisibilityPill: React.FC<{ visibility: "public" | "private" }> = ({
  visibility,
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
      visibility === "public"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : "border-amber-300/30 bg-amber-300/10 text-amber-200"
    }`}
  >
    {visibility === "public" ? (
      <Globe aria-hidden="true" size={11} />
    ) : (
      <Lock aria-hidden="true" size={11} />
    )}
    {visibility}
  </span>
);

export const RoomHeaderShareControls: React.FC<RoomShareProps> = ({
  roomId,
  visibility,
  roomSecret,
  onCopyCode,
}) => {
  const [open, setOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shareUrl = buildRoomShareUrl(roomId);
  const nativeShareAvailable = supportsNativeShare();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleCopyLink = async () => {
    const ok = await copyText(shareUrl, "Room link copied");
    if (ok) {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <p className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 md:block">
        Geobble multiplayer
      </p>
      <div className="flex items-center gap-1 md:gap-2">
        <p className="font-mono text-base font-black tracking-[0.15em] md:text-lg">
          {roomId}
        </p>
        <span className="hidden sm:inline-flex">
          <VisibilityPill visibility={visibility} />
        </span>
        <button
          aria-label="Copy room code"
          className="rounded-md p-1.5 text-white/55 transition hover:bg-white/10 hover:text-sky-300"
          onClick={onCopyCode}
          title="Copy room code"
          type="button"
        >
          <Copy aria-hidden="true" size={16} />
        </button>
        <button
          aria-expanded={open}
          aria-label="Share room"
          className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase transition md:px-2.5 md:py-1.5 md:text-xs ${
            open
              ? "border-sky-300/60 bg-sky-400/20 text-sky-200"
              : "border-white/15 bg-white/5 text-white/85 hover:border-sky-300/40 hover:bg-sky-400/10 hover:text-sky-200"
          }`}
          onClick={() => setOpen((value) => !value)}
          title="Share room link"
          type="button"
        >
          <Share2 aria-hidden="true" size={14} />
          <span className="hidden md:inline">Share</span>
        </button>
      </div>

      {open && (
        <div
          aria-label="Room share options"
          className="fixed inset-x-3 top-14 z-50 rounded-2xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
          role="dialog"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Share room
              </span>
              <VisibilityPill visibility={visibility} />
            </div>
            <button
              aria-label="Close share options"
              className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                Shareable link
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-sky-200">
                  {shareUrl}
                </span>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-400 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-950 transition hover:bg-sky-300"
                  onClick={() => void handleCopyLink()}
                  type="button"
                >
                  {copiedLink ? (
                    <Check aria-hidden="true" size={12} />
                  ) : (
                    <Link2 aria-hidden="true" size={12} />
                  )}
                  {copiedLink ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>

            {visibility === "private" && roomSecret && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Room secret (required to join)
                </p>
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2">
                  <span className="min-w-0 flex-1 font-mono text-xs font-bold tracking-wider text-amber-200">
                    {showSecret ? roomSecret : "•".repeat(roomSecret.length)}
                  </span>
                  <button
                    aria-label={showSecret ? "Hide room secret" : "Show room secret"}
                    className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                    onClick={() => setShowSecret((value) => !value)}
                    type="button"
                  >
                    {showSecret ? (
                      <EyeOff aria-hidden="true" size={14} />
                    ) : (
                      <Eye aria-hidden="true" size={14} />
                    )}
                  </button>
                  <button
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300/30 bg-amber-300/15 px-2.5 py-1 text-[11px] font-black uppercase text-amber-100 transition hover:bg-amber-300/25"
                    onClick={() =>
                      void copyText(roomSecret, "Room secret copied")
                    }
                    type="button"
                  >
                    <Copy aria-hidden="true" size={11} />
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-black uppercase text-white/85 transition hover:bg-white/10"
                onClick={onCopyCode}
                type="button"
              >
                <Copy aria-hidden="true" size={12} />
                Copy code
              </button>
              {visibility === "private" && roomSecret && (
                <button
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-black uppercase text-white/85 transition hover:bg-white/10"
                  onClick={() =>
                    void copyText(
                      buildRoomInviteMessage(roomId, shareUrl, roomSecret),
                      "Invite link & secret copied",
                    )
                  }
                  type="button"
                >
                  <Copy aria-hidden="true" size={12} />
                  Copy invite
                </button>
              )}
              {nativeShareAvailable && (
                <button
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-300/30 bg-sky-400/15 px-3 py-2 text-[11px] font-black uppercase text-sky-200 transition hover:bg-sky-400/25"
                  onClick={() =>
                    void triggerNativeShare(roomId, shareUrl, roomSecret)
                  }
                  type="button"
                >
                  <Share2 aria-hidden="true" size={12} />
                  Share…
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RoomInviteCard: React.FC<RoomShareProps> = ({
  roomId,
  visibility,
  roomSecret,
  onCopyCode,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const shareUrl = buildRoomShareUrl(roomId);
  const nativeShareAvailable = supportsNativeShare();

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-left backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black uppercase tracking-wider text-white">
          Invite friends
        </p>
        <VisibilityPill visibility={visibility} />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-white/55">
        {visibility === "private" && roomSecret
          ? "Share the room link and secret below. At least 2 connected players are needed to start."
          : "Anyone with this link or room code can join. At least 2 connected players are needed to start."}
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-sky-200">
          {shareUrl}
        </span>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-black uppercase text-slate-950 transition hover:bg-sky-300"
          onClick={() => void copyText(shareUrl, "Room link copied")}
          type="button"
        >
          <Link2 aria-hidden="true" size={13} />
          Copy link
        </button>
      </div>

      {visibility === "private" && roomSecret && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
              Room secret
            </span>
            <span className="font-mono text-sm font-black tracking-wider text-amber-200">
              {showSecret ? roomSecret : "•".repeat(roomSecret.length)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              aria-label={showSecret ? "Hide lobby room secret" : "Show lobby room secret"}
              className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              onClick={() => setShowSecret((value) => !value)}
              type="button"
            >
              {showSecret ? (
                <EyeOff aria-hidden="true" size={14} />
              ) : (
                <Eye aria-hidden="true" size={14} />
              )}
            </button>
            <button
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300/30 bg-amber-300/15 px-2.5 py-1.5 text-[11px] font-black uppercase text-amber-100 transition hover:bg-amber-300/25"
              onClick={() => void copyText(roomSecret, "Room secret copied")}
              type="button"
            >
              <Copy aria-hidden="true" size={12} />
              Copy secret
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white/85 transition hover:bg-white/10"
          onClick={onCopyCode}
          type="button"
        >
          <Copy aria-hidden="true" size={13} />
          Copy code ({roomId})
        </button>
        {visibility === "private" && roomSecret && (
          <button
            className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white/85 transition hover:bg-white/10"
            onClick={() =>
              void copyText(
                buildRoomInviteMessage(roomId, shareUrl, roomSecret),
                "Invite link & secret copied",
              )
            }
            type="button"
          >
            <Copy aria-hidden="true" size={13} />
            Copy invite
          </button>
        )}
        {nativeShareAvailable && (
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300/30 bg-sky-400/15 px-3 py-2 text-xs font-black uppercase text-sky-200 transition hover:bg-sky-400/25"
            onClick={() =>
              void triggerNativeShare(roomId, shareUrl, roomSecret)
            }
            type="button"
          >
            <Share2 aria-hidden="true" size={13} />
            Share
          </button>
        )}
      </div>
    </div>
  );
};

