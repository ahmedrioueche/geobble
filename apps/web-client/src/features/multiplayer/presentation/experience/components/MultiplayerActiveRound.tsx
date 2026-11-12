import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Play } from "lucide-react";
import type {
  PowerUpKind,
  ReactionEmoji,
  RoomSnapshot,
} from "../../../contracts/multiplayerRoomProtocol";
import { FlagImage } from "../../../../../components/atoms/FlagImage";
import { PowerUpBar } from "../../PowerUpBar";
import { RoundRecapCard } from "../../RoundRecapCard";
import { MatchPausedOverlay } from "../../MatchPausedOverlay";

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

interface MultiplayerActiveRoundProps {
  snapshot: RoomSnapshot;
  round: RoomSnapshot["game"]["round"];
  self: RoomSnapshot["players"][number] | null | undefined;
  selfPlayerId: string | null;
  isAdmin: boolean;
  isSelfPaused: boolean;
  isRoomPaused: boolean;
  isUpdatingPause: boolean;
  waitingForCommand: boolean;
  hasAnswered: boolean;
  isChoiceMode: boolean;
  lastAnswerResult: boolean | null;
  remainingTime: number | null;
  roundRemainingMs: number;
  pauseRemainingMs: number | null;
  spectatorPromptRemainingMs: number | null;
  visibleSettingsNotice: { queued?: boolean } | null;
  voteBanner?: React.ReactNode;
  isCorrectChoice: (choice: {
    id: string;
    label: string;
    flagCode?: string;
  }) => boolean;
  onSubmitChoice: (choiceId: string) => void;
  onReveal: () => void;
  onConfirmSpectating: () => void;
  onTogglePause: (targetPaused: boolean) => void;
  onUsePowerUp: (kind: PowerUpKind) => void;
  onSendReaction: (emoji: ReactionEmoji) => void;
}

export const MultiplayerActiveRound: React.FC<MultiplayerActiveRoundProps> = ({
  snapshot,
  round,
  self,
  selfPlayerId,
  isAdmin,
  isSelfPaused,
  isRoomPaused,
  isUpdatingPause,
  waitingForCommand,
  hasAnswered,
  isChoiceMode,
  lastAnswerResult,
  remainingTime,
  roundRemainingMs,
  pauseRemainingMs,
  spectatorPromptRemainingMs,
  visibleSettingsNotice,
  voteBanner,
  isCorrectChoice,
  onSubmitChoice,
  onReveal,
  onConfirmSpectating,
  onTogglePause,
  onUsePowerUp,
  onSendReaction,
}) => {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-16 z-20 flex flex-col items-end gap-2 md:inset-x-6 md:top-24 md:flex-row md:items-start md:justify-between">
        {voteBanner && (
          <div className="w-[min(22rem,calc(100vw-1.5rem))] md:w-80">
            {voteBanner}
          </div>
        )}
        <div className="pointer-events-auto ml-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl md:p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-sky-300">
            <span className="flex flex-wrap items-center gap-1.5">
              <span>
                {snapshot.game.legNumber !== undefined
                  ? `Leg ${snapshot.game.legNumber} · `
                  : ""}
                {snapshot.config.mode}
                {round?.difficultyTier ? ` · ${round.difficultyTier}` : ""}
              </span>
              {(snapshot.game.legMultiplier ?? 1) > 1 && (
                <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                  {snapshot.game.legMultiplier}x
                </span>
              )}
            </span>
            <span>
              {remainingTime === null
                ? `${snapshot.game.legRoundNumber ?? round?.number ?? 0}${
                    snapshot.config.challengeType === "count"
                      ? ` / ${snapshot.config.challengeValue}`
                      : ""
                  }`
                : formatTime(remainingTime)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {isRoomPaused && !round?.revealed ? (
              <p className="min-w-0 text-sm font-bold uppercase leading-snug md:text-base">
                Match paused — prompt hidden
              </p>
            ) : round?.prompt.type === "flag" ? (
              <div className="flex min-w-0 items-center gap-3">
                <FlagImage
                  alt="Target flag"
                  className="h-12 w-auto rounded-lg border border-white/15 shadow-md md:h-14"
                  code={round.prompt.flagCode}
                  fallback={
                    <span className="text-3xl leading-none" role="img">
                      {round.prompt.value}
                    </span>
                  }
                  size="md"
                />
              </div>
            ) : (
              <p className="min-w-0 text-sm font-bold uppercase leading-snug md:text-base">
                {round?.prompt.value ?? "Waiting for the next round"}
              </p>
            )}
            {isAdmin && !round?.revealed && (
              <button
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase text-white/85 transition hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40"
                disabled={waitingForCommand}
                onClick={onReveal}
                type="button"
              >
                Reveal
              </button>
            )}
          </div>
          {isSelfPaused &&
            !isRoomPaused &&
            snapshot.status === "playing" &&
            (spectatorPromptRemainingMs !== null ? (
              <div
                aria-label="Spectator inactivity check"
                className="mt-2.5 rounded-xl border border-amber-300/35 bg-amber-400/10 p-2.5"
                role="alert"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase text-amber-200">
                  <span>Still spectating?</span>
                  <span className="font-mono text-amber-300">
                    {Math.ceil(spectatorPromptRemainingMs / 1000)}s
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="flex-1 rounded-lg border border-amber-300/40 bg-amber-300/20 px-2.5 py-1.5 text-[10px] font-black uppercase text-amber-100 transition hover:bg-amber-300/30"
                    onClick={onConfirmSpectating}
                    type="button"
                  >
                    Still watching
                  </button>
                  <button
                    aria-busy={isUpdatingPause}
                    className="flex-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                    disabled={isUpdatingPause}
                    onClick={() => onTogglePause(false)}
                    type="button"
                  >
                    {isUpdatingPause ? "Resuming…" : "Resume playing"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                aria-busy={isUpdatingPause}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black uppercase text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                disabled={isUpdatingPause}
                onClick={() => onTogglePause(false)}
                type="button"
              >
                {isUpdatingPause ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                ) : (
                  <Play
                    aria-hidden="true"
                    className="h-3.5 w-3.5 fill-current"
                  />
                )}
                <span>
                  {isUpdatingPause ? "Resuming…" : "Resume playing"}
                </span>
              </button>
            ))}
          {round &&
            !round.revealed &&
            round.startedAt != null &&
            round.deadlineAt != null && (
              <div
                aria-label={`${Math.ceil(roundRemainingMs / 1000)} seconds left`}
                className="mt-2.5"
                role="timer"
              >
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                      roundRemainingMs <= 5000 ? "bg-rose-400" : "bg-sky-400"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (roundRemainingMs /
                          Math.max(1, round.deadlineAt - round.startedAt)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
                <p
                  className={`mt-1 text-right font-mono text-[10px] font-black ${
                    roundRemainingMs <= 5000 ? "text-rose-300" : "text-white/50"
                  }`}
                >
                  {Math.ceil(roundRemainingMs / 1000)}s
                </p>
              </div>
            )}
          {round?.revealed &&
            round.answerReveal &&
            (isChoiceMode || snapshot.config.subMode !== "name") &&
            !(isChoiceMode && snapshot.config.subMode === "flag") &&
            round.prompt.value.trim().toLowerCase() !==
              round.answerReveal.countryName.trim().toLowerCase() && (
              <p className="mt-2 text-xs font-black uppercase text-emerald-300">
                Answer: {round.answerReveal.countryName}
              </p>
            )}
          {self?.hint && !round?.revealed && (
            <p
              className="mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200"
              role="note"
            >
              💡 {self.hint}
            </p>
          )}
          {(lastAnswerResult === false || self?.lockedOut) &&
            !round?.revealed && (
              <p
                className="mt-2 text-xs font-black uppercase text-rose-300"
                role="status"
              >
                Locked out — waiting for other players
              </p>
            )}
          {visibleSettingsNotice && (
            <p className="mt-2 text-[10px] font-bold text-amber-200">
              Settings{" "}
              {visibleSettingsNotice.queued
                ? "queued for the next round"
                : "updated"}
              .
            </p>
          )}
          {isChoiceMode &&
            round &&
            !isRoomPaused &&
            (!round.revealed || snapshot.config.subMode === "flag") && (
              <div
                className={
                  snapshot.config.subMode === "flag"
                    ? "mt-3 grid grid-cols-2 gap-2"
                    : "mt-3 grid gap-2"
                }
              >
                <AnimatePresence mode="popLayout">
                  {round.choices
                    .filter(
                      (choice) => !self?.hiddenChoiceIds?.includes(choice.id),
                    )
                    .map((choice) => {
                      const isCorrect = isCorrectChoice(choice);
                      if (
                        round.revealed &&
                        snapshot.config.subMode === "flag" &&
                        !isCorrect
                      ) {
                        return null;
                      }
                      return (
                        <motion.button
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-xl border transition-all ${
                            round.revealed &&
                            snapshot.config.subMode === "flag" &&
                            isCorrect
                              ? "col-span-2 flex min-h-16 items-center justify-between border-emerald-400 bg-gradient-to-r from-emerald-500/35 via-emerald-500/20 to-slate-900/95 px-3 py-2.5 text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/50"
                              : snapshot.config.subMode === "flag"
                                ? "flex h-14 items-center justify-center border-white/15 bg-white/5 p-2 hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40 md:h-16"
                                : "border-white/15 bg-white/5 px-3 py-3 text-left text-xs font-black uppercase hover:border-sky-300/50 hover:bg-sky-300/10 disabled:opacity-40"
                          }`}
                          disabled={
                            round.revealed ||
                            hasAnswered ||
                            waitingForCommand ||
                            isSelfPaused ||
                            isRoomPaused
                          }
                          exit={{
                            filter: "blur(6px)",
                            opacity: 0,
                            scale: 0.65,
                            transition: {
                              duration: 0.28,
                              ease: "easeIn",
                            },
                          }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          key={choice.id}
                          layout
                          onClick={() =>
                            !round.revealed && onSubmitChoice(choice.id)
                          }
                          transition={{
                            duration: 0.25,
                            layout: {
                              duration: 0.38,
                              ease: [0.16, 1, 0.3, 1],
                            },
                          }}
                          type="button"
                        >
                          {snapshot.config.subMode === "flag" &&
                          choice.flagCode ? (
                            round.revealed && isCorrect ? (
                              <div className="flex w-full items-center justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                  <FlagImage
                                    alt="Flag choice"
                                    className="h-9 w-auto shrink-0 rounded-md border-2 border-white shadow-md md:h-10"
                                    code={choice.flagCode}
                                    fallback={
                                      <span className="text-2xl leading-none">
                                        {choice.label}
                                      </span>
                                    }
                                    size="sm"
                                  />
                                  <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                      Correct Answer
                                    </span>
                                    <span className="truncate text-sm font-black text-white md:text-base">
                                      {round.answerReveal?.countryName ||
                                        choice.label}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-md">
                                  <Check
                                    aria-hidden="true"
                                    className="h-4 w-4 stroke-[3]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <FlagImage
                                alt="Flag choice"
                                className="mx-auto h-8 w-auto rounded-md border border-white/15 shadow-sm md:h-9"
                                code={choice.flagCode}
                                fallback={
                                  <span className="text-2xl leading-none">
                                    {choice.label}
                                  </span>
                                }
                                size="sm"
                              />
                            )
                          ) : (
                            choice.label
                          )}
                        </motion.button>
                      );
                    })}
                </AnimatePresence>
              </div>
            )}
          {round && !round.revealed && self?.powerUps && !isRoomPaused && (
            <PowerUpBar
              disabled={
                hasAnswered || waitingForCommand || isSelfPaused || isRoomPaused
              }
              doubleActive={Boolean(self.doubleActive)}
              hasRoundTimer={round.deadlineAt != null}
              isChoiceMode={Boolean(isChoiceMode)}
              onUsePowerUp={onUsePowerUp}
              powerUps={self.powerUps}
            />
          )}
          {round?.revealed && round.result && (
            <RoundRecapCard
              answerName={round.answerReveal?.countryName}
              onSendReaction={onSendReaction}
              players={snapshot.players}
              result={round.result}
              selfPlayerId={selfPlayerId}
            />
          )}
        </div>
      </div>
      {snapshot.status === "playing" && isRoomPaused && (
        <MatchPausedOverlay
          onResume={() => onTogglePause(false)}
          pausedPlayerNames={snapshot.players
            .filter((player) => player.connected && player.paused)
            .map((player) => player.name)}
          remainingMs={pauseRemainingMs}
          selfPaused={isSelfPaused}
          updatingPause={isUpdatingPause}
        />
      )}
    </>
  );
};
