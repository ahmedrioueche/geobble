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

export const revealRoomRound = (
  room: RoomRecord,
  now: number,
  advanceDelayMs: number,
): void => {
  const round = room.game.round;
  if (!round) throw new RoomDomainError('INVALID_COMMAND');
  for (const player of room.players) {
    if (player.answeredMissionId !== round.missionId) {
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
  const round = room.game.round;
  const connectedPlayers = room.players.filter((player) => player.connected);
  return (
    !!round &&
    connectedPlayers.length > 0 &&
    connectedPlayers.every(
      (player) => player.answeredMissionId === round.missionId,
    )
  );
};
