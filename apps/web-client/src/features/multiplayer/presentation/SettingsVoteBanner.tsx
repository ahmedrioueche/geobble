import { useState } from "react";
import type React from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Vote, X } from "lucide-react";
import type {
  RoomConfiguration,
  RoomSettingsVote,
} from "../contracts/multiplayerRoomProtocol";
import { getRoomSettingsDiff } from "./roomSettingsDiff";

interface SettingsVoteBannerProps {
  vote: RoomSettingsVote;
  currentConfig: RoomConfiguration;
  selfPlayerId: string;
  otherEligiblePlayerName?: string | null;
  isSelfPaused: boolean;
  connected: boolean;
  nowMs: number;
  variant: "floating" | "inline";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onVote: (voteId: string, approve: boolean) => Promise<void>;
}

export const SettingsVoteBanner: React.FC<SettingsVoteBannerProps> = ({
  vote,
  currentConfig,
  selfPlayerId,
  otherEligiblePlayerName,
  isSelfPaused,
  connected,
  nowMs,
  variant,
  collapsed = false,
  onToggleCollapse,
  onVote,
}) => {
  const [submitting, setSubmitting] = useState<"yes" | "no" | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const diffs = getRoomSettingsDiff(currentConfig, vote.proposedConfig);
  const yesCount = vote.yesPlayerIds.length;
  const noCount = vote.noPlayerIds.length;
  const myVote: "yes" | "no" | null = vote.yesPlayerIds.includes(selfPlayerId)
    ? "yes"
    : vote.noPlayerIds.includes(selfPlayerId)
      ? "no"
      : null;

  const totalDurationMs = Math.max(1, vote.expiresAt - vote.createdAt);
  const remainingMs = Math.max(0, vote.expiresAt - nowMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPercent = Math.min(100, (remainingMs / totalDurationMs) * 100);
  const isProposer = vote.proposerPlayerId === selfPlayerId;
  const isTwoPlayerVote = vote.eligibleCount === 2;
  const neededMore = Math.max(0, vote.requiredYes - yesCount);

  const castVote = (approve: boolean) => {
    setVoteError(null);
    setSubmitting(approve ? "yes" : "no");
    void onVote(vote.voteId, approve)
      .catch((error: unknown) => {
        setVoteError(
          error instanceof Error ? error.message : "Could not submit your vote.",
        );
      })
      .finally(() => setSubmitting(null));
  };

  if (variant === "floating" && collapsed) {
    const compactChange =
      diffs.length > 0
        ? diffs.map((diff) => `${diff.label}: ${diff.to}`).join(" · ")
        : "Settings change";
    const compactStatus = isTwoPlayerVote
      ? `Waiting for ${otherEligiblePlayerName ?? "other player"}`
      : `${yesCount}/${vote.requiredYes}`;

    return (
      <div
        aria-label="Settings vote"
        className="pointer-events-auto flex items-center justify-between gap-2 rounded-full border border-sky-300/40 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl"
        role="region"
      >
        <button
          aria-expanded={false}
          aria-label="Expand settings vote"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onToggleCollapse}
          type="button"
        >
          <Vote aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span className="truncate font-bold text-white">{compactChange}</span>
          <span className="shrink-0 rounded bg-sky-400/15 px-1.5 py-0.5 font-mono text-[11px] font-black text-sky-200">
            {compactStatus}
          </span>
          <span className="shrink-0 font-mono text-[11px] font-bold text-white/55">
            {remainingSeconds}s
          </span>
          <ChevronUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-white/60" />
        </button>
      </div>
    );
  }

  const headerTitle = isTwoPlayerVote
    ? isProposer
      ? `Waiting for ${otherEligiblePlayerName ?? "opponent"}`
      : `${vote.proposerName} wants to change settings`
    : isProposer
      ? "Your settings proposal"
      : `${vote.proposerName} proposes`;

  return (
    <div
      aria-label="Settings vote"
      className={
        variant === "floating"
          ? "pointer-events-auto rounded-2xl border border-sky-400/50 bg-slate-950/95 p-3.5 shadow-[0_12px_40px_rgba(56,189,248,0.2)] backdrop-blur-xl"
          : "rounded-2xl border border-sky-300/40 bg-sky-400/10 p-3.5 md:p-4"
      }
      role="region"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Vote aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <p className="text-[11px] font-black uppercase tracking-wider text-sky-300">
              {headerTitle}
            </p>
            {!isTwoPlayerVote && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-white/80">
                {yesCount}/{vote.requiredYes} yes
                {noCount > 0 ? ` · ${noCount} no` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-[11px] font-black text-sky-200">
            {remainingSeconds}s
          </span>
          {variant === "floating" && onToggleCollapse && (
            <button
              aria-expanded={true}
              aria-label="Minimize settings vote"
              className="rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              onClick={onToggleCollapse}
              type="button"
            >
              <ChevronDown aria-hidden="true" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${remainingSeconds <= 5 ? "bg-amber-400" : "bg-sky-400"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {diffs.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {diffs.map((diff) => (
            <li
              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-slate-950/75 px-2 py-1 text-[11px]"
              key={diff.key}
            >
              <span className="font-bold uppercase text-white/50">
                {diff.label}:
              </span>
              <span className="text-white/55 line-through">{diff.from}</span>
              <span aria-hidden="true" className="text-sky-300">
                →
              </span>
              <span className="font-black text-white">{diff.to}</span>
            </li>
          ))}
        </ul>
      )}

      {myVote ? (
        <p className="mt-2.5 text-xs font-bold text-white/75">
          {isTwoPlayerVote ? (
            <>
              Sent — waiting for{" "}
              <span className="text-sky-200">
                {otherEligiblePlayerName ?? "other player"}
              </span>{" "}
              to accept
            </>
          ) : (
            <>
              You voted{" "}
              <span
                className={
                  myVote === "yes" ? "text-emerald-300" : "text-rose-300"
                }
              >
                {myVote === "yes" ? "Yes" : "No"}
              </span>
              {neededMore > 0
                ? ` · Waiting for ${neededMore} more yes ${neededMore === 1 ? "vote" : "votes"}`
                : ""}
            </>
          )}
        </p>
      ) : isSelfPaused ? (
        <p className="mt-2.5 text-xs font-semibold text-amber-200">
          Resume playing to respond to this proposal.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            aria-busy={submitting === "yes"}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!connected || submitting !== null}
            onClick={() => castVote(true)}
            type="button"
          >
            {submitting === "yes" ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            <span>{isTwoPlayerVote ? "Accept" : "Yes"}</span>
          </button>
          <button
            aria-busy={submitting === "no"}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300/35 bg-rose-500/15 px-3 py-2 text-xs font-black uppercase text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!connected || submitting !== null}
            onClick={() => castVote(false)}
            type="button"
          >
            {submitting === "no" ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            <span>{isTwoPlayerVote ? "Decline" : "No"}</span>
          </button>
        </div>
      )}

      {voteError && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {voteError}
        </p>
      )}
    </div>
  );
};
