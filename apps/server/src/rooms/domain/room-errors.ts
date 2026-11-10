export type RoomErrorCode =
  | 'INVALID_REQUEST'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_NOT_JOINABLE'
  | 'ROOM_NOT_STARTABLE'
  | 'ROUND_UNAVAILABLE'
  | 'NOT_ADMIN'
  | 'NOT_CONNECTED'
  | 'NOT_AUTHORIZED'
  | 'STALE_REVISION'
  | 'STALE_MISSION'
  | 'DUPLICATE_COMMAND'
  | 'INVALID_COMMAND'
  | 'ROOM_EXPIRED'
  | 'RATE_LIMITED';

const safeMessages: Record<RoomErrorCode, string> = {
  INVALID_REQUEST: 'The room request is invalid.',
  ROOM_NOT_FOUND: 'That room could not be found.',
  ROOM_FULL: 'That room is full.',
  ROOM_NOT_JOINABLE: 'That room is no longer accepting players.',
  ROOM_NOT_STARTABLE: 'At least 2 connected players are needed to start the game.',
  ROUND_UNAVAILABLE:
    'This game mode needs country map coordinates, but none were found in the country data. Check the server country data settings.',
  NOT_ADMIN: 'Only the room admin can do that.',
  NOT_CONNECTED: 'This player is not connected to the room.',
  NOT_AUTHORIZED: 'This player is not authorized to reconnect.',
  STALE_REVISION: 'The room changed; refresh the room and try again.',
  STALE_MISSION: 'That command belongs to an earlier round.',
  DUPLICATE_COMMAND: 'That command has already been processed.',
  INVALID_COMMAND: 'That command is not valid for this round.',
  ROOM_EXPIRED: 'That room has expired.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
};

export class RoomDomainError extends Error {
  constructor(
    readonly code: RoomErrorCode,
    message = safeMessages[code],
  ) {
    super(message);
    this.name = 'RoomDomainError';
  }
}

export const getRoomErrorMessage = (code: RoomErrorCode): string =>
  safeMessages[code];
