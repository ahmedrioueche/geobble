import {
  DEFAULT_PLAYER_POWER_UPS,
  type RoomRecord,
  type RoomRoundRecord,
  type RoomSnapshot,
  type RoundResult,
} from './room.types.js';

export const toRoomSnapshot = (
  room: RoomRecord,
  recipientPlayerId?: string | null,
): RoomSnapshot => {
  const missionId = room.game.round?.missionId ?? null;
  const revealed = room.game.round?.revealed ?? false;
  const answerByPlayer = new Map(
    (room.game.round?.answers ?? []).map((item) => [item.playerId, item]),
  );

  return {
    roomId: room.roomId,
    revision: room.revision,
    status: room.status,
    visibility: room.visibility ?? 'private',
    adminPlayerId: room.adminPlayerId,
    config: { ...room.config },
    pendingConfig: room.pendingConfig ? { ...room.pendingConfig } : null,
    players: room.players.map((player) => {
      const answered =
        missionId !== null && player.answeredMissionId === missionId;
      const answerRecord = answerByPlayer.get(player.playerId);
      const isRecipient =
        recipientPlayerId !== undefined &&
        recipientPlayerId !== null &&
        player.playerId === recipientPlayerId;
      const lockedOut =
        answered &&
        answerRecord?.correct === false &&
        (revealed || isRecipient);

      return {
        id: player.playerId,
        name: player.name,
        isAdmin: player.playerId === room.adminPlayerId,
        ready: player.ready,
        connected: player.connected,
        ...(player.paused ? { paused: true } : {}),
        ...(player.paused && player.spectatorPromptDeadlineAt != null
          ? { spectatorPromptDeadlineAt: player.spectatorPromptDeadlineAt }
          : {}),
        score: player.score,
        streak: player.streak,
        maxStreak: player.maxStreak,
        pinLocation: revealed
          ? player.pinLocation
            ? [player.pinLocation[0], player.pinLocation[1]]
            : null
          : null,
        answered,
        ...(lockedOut ? { lockedOut: true } : {}),
        powerUps: player.powerUps
          ? { ...player.powerUps }
          : { ...DEFAULT_PLAYER_POWER_UPS },
        ...(missionId !== null &&
        player.doubleActiveForMissionId === missionId
          ? { doubleActive: true }
          : {}),
        ...(isRecipient &&
        missionId !== null &&
        player.hiddenChoiceIdsForMissionId === missionId &&
        player.hiddenChoiceIds &&
        player.hiddenChoiceIds.length > 0
          ? { hiddenChoiceIds: [...player.hiddenChoiceIds] }
          : {}),
        ...(isRecipient &&
        missionId !== null &&
        player.hintForMissionId === missionId &&
        player.hintText
          ? { hint: player.hintText }
          : {}),
      };
    }),
    game: {
      startedAt: room.game.startedAt,
      timerDeadlineAt: room.game.timerDeadlineAt,
      ...(room.game.paused
        ? {
            paused: true,
            pauseDeadlineAt: room.game.pauseDeadlineAt ?? null,
          }
        : {}),
      round: room.game.round
        ? {
            missionId: room.game.round.missionId,
            number: room.game.round.number,
            ...(room.game.round.difficultyTier
              ? { difficultyTier: room.game.round.difficultyTier }
              : {}),
            prompt: {
              ...room.game.round.prompt,
              ...(room.game.round.prompt.mapAnchor
                ? {
                    mapAnchor: [
                      room.game.round.prompt.mapAnchor[0],
                      room.game.round.prompt.mapAnchor[1],
                    ],
                  }
                : {}),
            },
            choices: room.game.round.choices.map(({ id, label }) => ({
              id,
              label,
            })),
            revealed: room.game.round.revealed,
            answerReveal: room.game.round.answerReveal
              ? { ...room.game.round.answerReveal }
              : null,
            startedAt: room.game.round.startedAt ?? null,
            deadlineAt: room.game.round.deadlineAt ?? null,
            result: toRoundResult(room.game.round),
          }
        : null,
    },
  };
};

const toRoundResult = (round: RoomRoundRecord): RoundResult | null => {
  // Correctness is only disclosed once the round has been revealed.
  if (!round.revealed) return null;
  const players = (round.answers ?? []).map((answer) => ({ ...answer }));
  const fastest = players
    .filter((answer) => answer.correct)
    .sort((first, second) => first.elapsedMs - second.elapsedMs)[0];
  const withDistance = players
    .filter(
      (answer): answer is typeof answer & { distanceKm: number } =>
        typeof answer.distanceKm === 'number' &&
        Number.isFinite(answer.distanceKm),
    )
    .sort((first, second) => first.distanceKm - second.distanceKm)[0];

  return {
    fastestPlayerId: fastest?.playerId ?? null,
    ...(withDistance
      ? {
          closestPinPlayerId: withDistance.playerId,
          closestPinDistanceKm: withDistance.distanceKm,
        }
      : { closestPinPlayerId: null, closestPinDistanceKm: null }),
    players,
  };
};
