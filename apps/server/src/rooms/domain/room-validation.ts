import type {
  ChallengeType,
  DifficultyMode,
  GameMode,
  PinDirection,
  PowerUpKind,
  ReactionEmoji,
  RoomConfiguration,
  RoomCreateRequest,
  RoomCommand,
  RoomInspectRequest,
  RoomJoinRequest,
  RoomReconnectRequest,
  SubMode,
} from './room.types.js';
import { ALLOWED_DIFFICULTY_MODES } from '../../game/country-difficulty.js';
import { RoomDomainError } from './room-errors.js';

export const ALLOWED_REACTION_EMOJIS: readonly ReactionEmoji[] = [
  '🔥',
  '👏',
  '😱',
  '😂',
  '🎯',
  '💀',
];

const POWER_UP_KINDS: readonly PowerUpKind[] = [
  'fifty',
  'hint',
  'double',
  'freeze',
];

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

  let roundTimeLimitSeconds: number | undefined;
  if (value.roundTimeLimitSeconds !== undefined) {
    if (
      typeof value.roundTimeLimitSeconds !== 'number' ||
      !Number.isSafeInteger(value.roundTimeLimitSeconds) ||
      value.roundTimeLimitSeconds < 0 ||
      value.roundTimeLimitSeconds > 120
    ) {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    roundTimeLimitSeconds = value.roundTimeLimitSeconds;
  }

  let speedScoring: boolean | undefined;
  if (value.speedScoring !== undefined) {
    if (typeof value.speedScoring !== 'boolean') {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    speedScoring = value.speedScoring;
  }

  let wrongAnswerPenalty: number | undefined;
  if (value.wrongAnswerPenalty !== undefined) {
    if (
      typeof value.wrongAnswerPenalty !== 'number' ||
      !Number.isSafeInteger(value.wrongAnswerPenalty) ||
      value.wrongAnswerPenalty < 0 ||
      value.wrongAnswerPenalty > 100
    ) {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    wrongAnswerPenalty = value.wrongAnswerPenalty;
  }

  let endless: boolean | undefined;
  if (value.endless !== undefined) {
    if (typeof value.endless !== 'boolean') {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    endless = value.endless;
  }

  let difficulty: DifficultyMode | undefined;
  if (value.difficulty !== undefined) {
    if (
      typeof value.difficulty !== 'string' ||
      !ALLOWED_DIFFICULTY_MODES.includes(value.difficulty as DifficultyMode)
    ) {
      throw new RoomDomainError('INVALID_REQUEST');
    }
    difficulty = value.difficulty as DifficultyMode;
  }

  return {
    mode: mode as GameMode,
    pinDirection:
      mode === 'pin' ? (pinDirection as PinDirection) : 'locate',
    subMode: subMode as SubMode,
    challengeType: challengeType as ChallengeType,
    challengeValue,
    ...(endless !== undefined ? { endless } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(roundTimeLimitSeconds !== undefined
      ? { roundTimeLimitSeconds }
      : {}),
    ...(speedScoring !== undefined ? { speedScoring } : {}),
    ...(wrongAnswerPenalty !== undefined ? { wrongAnswerPenalty } : {}),
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
  const secret = parseOptionalCreateSecret(value.secret);
  return {
    requestId: value.requestId,
    playerName,
    visibility,
    ...(secret !== undefined ? { secret } : {}),
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

  const roomId = parseRoomId(value.roomId);
  const secret = parseOptionalJoinSecret(value.secret);
  return {
    requestId: value.requestId,
    roomId,
    playerName: parsePlayerName(value.playerName),
    ...(secret !== undefined ? { secret } : {}),
  };
};

export const parseInspectRequest = (value: unknown): RoomInspectRequest => {
  if (
    !isRecord(value) ||
    !isSafeIdentifier(value.requestId) ||
    !isNonemptyString(value.roomId)
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }

  return {
    requestId: value.requestId,
    roomId: parseRoomId(value.roomId),
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

  return {
    requestId: value.requestId,
    roomId: parseRoomId(value.roomId),
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

  if (value.type === 'powerup') {
    if (
      typeof value.kind !== 'string' ||
      !POWER_UP_KINDS.includes(value.kind as PowerUpKind)
    ) {
      throw new RoomDomainError('INVALID_COMMAND');
    }
    return {
      ...identity,
      type: 'powerup',
      kind: value.kind as PowerUpKind,
    };
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

export const parseRoomId = (value: string): string => {
  const roomId = value.trim().toUpperCase();
  if (!/^(?:\d{4,12}|[A-Z0-9]{6,12})$/.test(roomId)) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return roomId;
};

const parseOptionalCreateSecret = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new RoomDomainError('INVALID_REQUEST');
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length < 4 || trimmed.length > 24) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return trimmed;
};

const parseOptionalJoinSecret = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new RoomDomainError('INVALID_REQUEST');
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 24) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return trimmed;
};

export const parsePlayerName = (value: unknown): string => {
  if (!isNonemptyString(value)) throw new RoomDomainError('INVALID_REQUEST');
  const name = value.trim();
  if (name.length > 24) throw new RoomDomainError('INVALID_REQUEST');
  return name;
};

export const isSafeIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);

export const parseReactionEmoji = (value: unknown): ReactionEmoji => {
  if (!isRecord(value) || typeof value.emoji !== 'string') {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  if (!ALLOWED_REACTION_EMOJIS.includes(value.emoji as ReactionEmoji)) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return value.emoji as ReactionEmoji;
};

export const parseVoteSettingsRequest = (
  value: unknown,
): { requestId: string; voteId: string; approve: boolean } => {
  if (
    !isRecord(value) ||
    !isSafeIdentifier(value.requestId) ||
    !isSafeIdentifier(value.voteId) ||
    typeof value.approve !== 'boolean'
  ) {
    throw new RoomDomainError('INVALID_REQUEST');
  }
  return {
    requestId: value.requestId,
    voteId: value.voteId,
    approve: value.approve,
  };
};
