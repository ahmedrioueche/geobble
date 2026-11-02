import type { RoomRecord, RoomSnapshot } from './room.types.js';

export const toRoomSnapshot = (room: RoomRecord): RoomSnapshot => ({
  roomId: room.roomId,
  revision: room.revision,
  status: room.status,
  visibility: room.visibility ?? 'private',
  adminPlayerId: room.adminPlayerId,
  config: { ...room.config },
  pendingConfig: room.pendingConfig ? { ...room.pendingConfig } : null,
  players: room.players.map((player) => ({
    id: player.playerId,
    name: player.name,
    isAdmin: player.playerId === room.adminPlayerId,
    ready: player.ready,
    connected: player.connected,
    score: player.score,
    streak: player.streak,
    maxStreak: player.maxStreak,
    pinLocation: room.game.round?.revealed
      ? player.pinLocation
        ? [player.pinLocation[0], player.pinLocation[1]]
        : null
      : null,
    answered: player.answeredMissionId === room.game.round?.missionId,
  })),
  game: {
    startedAt: room.game.startedAt,
    timerDeadlineAt: room.game.timerDeadlineAt,
    round: room.game.round
      ? {
          missionId: room.game.round.missionId,
          number: room.game.round.number,
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
          choices: room.game.round.choices.map(({ id, label }) => ({ id, label })),
          revealed: room.game.round.revealed,
          answerReveal: room.game.round.answerReveal
            ? { ...room.game.round.answerReveal }
            : null,
        }
      : null,
  },
});
