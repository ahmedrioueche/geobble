import type {
  RoomConfiguration,
  RoomRecord,
  RoomPlayerRecord,
  RoomRoundRecord,
} from './room.types.js';
import { RoomDomainError } from './room-errors.js';

export const resolveRoundTimeLimitMs = (
  roomConfig: RoomConfiguration,
  defaultTimeLimitMs: number,
): number => {
  if (typeof roomConfig.roundTimeLimitSeconds === 'number') {
    return Math.max(0, roomConfig.roundTimeLimitSeconds * 1_000);
  }
  return Math.max(0, defaultTimeLimitMs);
};

export const getNextAdminPlayerId = (
  players: RoomPlayerRecord[],
): string => {
  const connectedPlayers = players.filter((player) => player.connected);
  const candidates = connectedPlayers.length > 0 ? connectedPlayers : players;
  const oldest = [...candidates].sort(
    (first, second) =>
      first.joinedAt - second.joinedAt ||
      first.playerId.localeCompare(second.playerId),
  )[0];
  if (!oldest) throw new RoomDomainError('ROOM_NOT_FOUND');
  return oldest.playerId;
};

export const stampRoundTiming = (
  round: RoomRoundRecord,
  now: number,
  timeLimitMs: number,
): void => {
  round.startedAt = now;
  round.deadlineAt = timeLimitMs > 0 ? now + timeLimitMs : null;
  round.answers = [];
};

export const ROOM_PAUSE_LIMIT_MS = 90_000;

export const getActiveConnectedPlayers = (
  room: RoomRecord,
): RoomPlayerRecord[] =>
  room.players.filter((player) => player.connected && !player.paused);

export const revealRoomRound = (
  room: RoomRecord,
  now: number,
  advanceDelayMs: number,
): void => {
  const round = room.game.round;
  if (!round) throw new RoomDomainError('INVALID_COMMAND');
  for (const player of room.players) {
    if (!player.paused && player.answeredMissionId !== round.missionId) {
      player.streak = 0;
    }
  }
  round.revealed = true;
  round.answerReveal = {
    countryCode: round.targetCountryCode,
    countryName: round.targetCountryName,
  };
  room.game.advanceAt = now + advanceDelayMs;
};

export const areConnectedPlayersDone = (room: RoomRecord): boolean => {
  if (room.game.paused) return false;
  const round = room.game.round;
  const activePlayers = getActiveConnectedPlayers(room);
  return (
    !!round &&
    activePlayers.length > 0 &&
    activePlayers.every(
      (player) => player.answeredMissionId === round.missionId,
    )
  );
};

export const syncRoomPauseState = (
  room: RoomRecord,
  now: number,
  pauseLimitMs = ROOM_PAUSE_LIMIT_MS,
): void => {
  if (room.status !== 'playing') {
    room.game.paused = false;
    room.game.pausedAt = null;
    room.game.pauseDeadlineAt = null;
    room.game.pausedRoundRemainingMs = null;
    room.game.pausedTimerRemainingMs = null;
    room.game.pausedAdvanceRemainingMs = null;
    return;
  }

  const activePlayers = getActiveConnectedPlayers(room);
  const hasPausedConnectedPlayer = room.players.some(
    (player) => player.connected && Boolean(player.paused),
  );
  const shouldPauseRoom = activePlayers.length === 0 && hasPausedConnectedPlayer;

  if (shouldPauseRoom && !room.game.paused) {
    room.game.paused = true;
    room.game.pausedAt = now;
    room.game.pauseDeadlineAt = now + pauseLimitMs;

    const round = room.game.round;
    if (round && !round.revealed && round.deadlineAt != null) {
      room.game.pausedRoundRemainingMs = Math.max(
        1_000,
        round.deadlineAt - now,
      );
      round.deadlineAt = null;
    } else {
      room.game.pausedRoundRemainingMs = null;
    }

    if (room.game.timerDeadlineAt != null) {
      room.game.pausedTimerRemainingMs = Math.max(
        1_000,
        room.game.timerDeadlineAt - now,
      );
      room.game.timerDeadlineAt = null;
    } else {
      room.game.pausedTimerRemainingMs = null;
    }

    if (room.game.advanceAt != null) {
      room.game.pausedAdvanceRemainingMs = Math.max(
        500,
        room.game.advanceAt - now,
      );
      room.game.advanceAt = null;
    } else {
      room.game.pausedAdvanceRemainingMs = null;
    }
    return;
  }

  if (!shouldPauseRoom && room.game.paused) {
    const pausedDuration =
      room.game.pausedAt != null ? Math.max(0, now - room.game.pausedAt) : 0;
    room.game.paused = false;
    room.game.pausedAt = null;
    room.game.pauseDeadlineAt = null;

    const round = room.game.round;
    if (round) {
      if (round.startedAt != null) {
        round.startedAt += pausedDuration;
      }
      if (!round.revealed && room.game.pausedRoundRemainingMs != null) {
        round.deadlineAt = now + room.game.pausedRoundRemainingMs;
      }
    }

    if (room.game.pausedTimerRemainingMs != null) {
      room.game.timerDeadlineAt = now + room.game.pausedTimerRemainingMs;
    }

    if (room.game.pausedAdvanceRemainingMs != null) {
      room.game.advanceAt = now + room.game.pausedAdvanceRemainingMs;
    }

    room.game.pausedRoundRemainingMs = null;
    room.game.pausedTimerRemainingMs = null;
    room.game.pausedAdvanceRemainingMs = null;
  }
};
