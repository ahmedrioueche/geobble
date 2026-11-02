import type {
  ChallengeType,
  GameMode,
  PinDirection,
  RoomConfiguration,
  RoomCreateRequest,
  RoomCommand,
  RoomJoinRequest,
  RoomReconnectRequest,
  SubMode,
} from './room.types.js';
import { RoomDomainError } from './room-errors.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonemptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isPinLocation = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'number' &&
  Number.isFinite(value[0]) &&
  value[0] >= -180 &&
  value[0] <= 180 &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[1]) &&
  value[1] >= -90 &&
  value[1] <= 90;

export const parseRoomConfiguration = (
  value: unknown,
): RoomConfiguration => {
  if (!isRecord(value)) throw new RoomDomainError('INVALID_REQUEST');

  const mode = value.mode;
  const pinDirection = value.pinDirection;
  const subMode = value.subMode;
  const challengeType = value.challengeType;
  const challengeValue = value.challengeValue;

  if (
    !['identify', 'reverse', 'pin'].includes(String(mode)) ||
    !['locate', 'identify'].includes(String(pinDirection)) ||
    !['name', 'flag', 'capital'].includes(String(subMode)) ||
    !['world', 'count', 'timer'].includes(String(challengeType)) ||
    typeof challengeValue !== 'number' ||
    !Number.isSafeInteger(challengeValue) ||
    challengeValue < 0
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  if (
    (challengeType === 'world' && challengeValue !== 0) ||
    (challengeType !== 'world' && challengeValue < 1)
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  return {
    mode: mode as GameMode,
    pinDirection:
      mode === 'pin' ? (pinDirection as PinDirection) : 'locate',
    subMode: subMode as SubMode,
    challengeType: challengeType as ChallengeType,
    challengeValue,
  };
};

export const parseCreateRequest = (value: unknown): RoomCreateRequest => {
  if (!isRecord(value) || !isSafeIdentifier(value.requestId)) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  const playerName = parsePlayerName(value.playerName);
  const visibility =
    value.visibility === undefined
      ? 'private'
      : value.visibility === 'public' || value.visibility === 'private'
        ? value.visibility
        : null;
  if (!visibility) throw new RoomDomainError('INVALID_REQUEST');
  return {
    requestId: value.requestId,
    playerName,
    visibility,
    ...(value.config === undefined
      ? {}
      : { config: parseRoomConfiguration(value.config) }),
  };
};

export const parseJoinRequest = (value: unknown): RoomJoinRequest => {
  if (
    !isRecord(value) ||
    !isSafeIdentifier(value.requestId) ||
    !isNonemptyString(value.roomId)
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  const roomId = value.roomId.trim().toUpperCase();
  if (!/^(?:\d{4,12}|[A-Z0-9]{6,12})$/.test(roomId)) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return {
    requestId: value.requestId,
    roomId,
    playerName: parsePlayerName(value.playerName),
  };
};

export const parseReconnectRequest = (
  value: unknown,
): RoomReconnectRequest => {
  if (
    !isRecord(value) ||
    !isSafeIdentifier(value.requestId) ||
    !isNonemptyString(value.roomId) ||
    !isSafeIdentifier(value.playerId) ||
    typeof value.reconnectToken !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.reconnectToken)
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  const roomId = value.roomId.trim().toUpperCase();
  if (!/^(?:\d{4,12}|[A-Z0-9]{6,12})$/.test(roomId)) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return {
    requestId: value.requestId,
    roomId,
    playerId: value.playerId,
    reconnectToken: value.reconnectToken,
  };
};

export const parseRoomCommand = (value: unknown): RoomCommand => {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.commandId) ||
    Number(value.commandId) < 1 ||
    !Number.isSafeInteger(value.expectedRevision) ||
    Number(value.expectedRevision) < 0 ||
    !isSafeIdentifier(value.missionId)
  ) {
    throw new RoomDomainError('INVALID_COMMAND');
  }

  const identity = {
    commandId: Number(value.commandId),
    expectedRevision: Number(value.expectedRevision),
    missionId: value.missionId,
  };
  if (value.type === 'reveal' || value.type === 'skip') {
    return { ...identity, type: value.type };
  }

  if (
    value.type !== 'answer' ||
    (value.answerCountryCode !== null &&
      (typeof value.answerCountryCode !== 'string' ||
        !/^[A-Za-z0-9]{2,3}$/.test(value.answerCountryCode))) ||
    (value.choiceId !== undefined &&
      !isSafeIdentifier(value.choiceId)) ||
    (value.pinLocation !== undefined && !isPinLocation(value.pinLocation))
  ) {
    throw new RoomDomainError('INVALID_COMMAND');
  }

  return {
    ...identity,
    type: 'answer',
    answerCountryCode:
      typeof value.answerCountryCode === 'string'
        ? value.answerCountryCode.toUpperCase()
        : null,
    ...(typeof value.choiceId === 'string'
      ? { choiceId: value.choiceId }
      : {}),
    ...(isPinLocation(value.pinLocation)
      ? { pinLocation: [value.pinLocation[0], value.pinLocation[1]] as [number, number] }
      : {}),
  };
};

export const parsePlayerName = (value: unknown): string => {
  if (!isNonemptyString(value)) throw new RoomDomainError('INVALID_REQUEST');
  const name = value.trim();
  if (name.length > 24) throw new RoomDomainError('INVALID_REQUEST');
  return name;
};

export const isSafeIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
