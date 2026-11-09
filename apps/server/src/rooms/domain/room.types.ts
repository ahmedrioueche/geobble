export type GameMode = 'identify' | 'reverse' | 'pin';
export type PinDirection = 'locate' | 'identify';
export type SubMode = 'name' | 'flag' | 'capital';
export type ChallengeType = 'world' | 'count' | 'timer';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type RoomVisibility = 'public' | 'private';

export type PowerUpKind = 'fifty' | 'hint' | 'double' | 'freeze';

export type ReactionEmoji = '🔥' | '👏' | '😱' | '😂' | '🎯' | '💀';

export interface PlayerPowerUps {
  fifty: boolean;
  hint: boolean;
  double: boolean;
  freeze: boolean;
}

export const DEFAULT_PLAYER_POWER_UPS: PlayerPowerUps = {
  fifty: true,
  hint: true,
  double: true,
  freeze: true,
};

export interface RoomConfiguration {
  mode: GameMode;
  pinDirection: PinDirection;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
  roundTimeLimitSeconds?: number;
  speedScoring?: boolean;
  wrongAnswerPenalty?: number;
}

export const DEFAULT_ROOM_CONFIGURATION: RoomConfiguration = {
  mode: 'identify',
  pinDirection: 'locate',
  subMode: 'name',
  challengeType: 'world',
  challengeValue: 0,
  roundTimeLimitSeconds: 20,
  speedScoring: true,
  wrongAnswerPenalty: 0,
};

export interface RoomPlayerRecord {
  playerId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
  reconnectTokenHash: string;
  score: number;
  streak: number;
  maxStreak: number;
  pinLocation: [number, number] | null;
  answeredMissionId: string | null;
  lastCommandId: number;
  powerUps?: PlayerPowerUps;
  doubleActiveForMissionId?: string | null;
  hiddenChoiceIdsForMissionId?: string | null;
  hiddenChoiceIds?: string[];
  hintForMissionId?: string | null;
  hintText?: string | null;
}

export interface PublicPrompt {
  type: 'text' | 'flag' | 'instruction';
  value: string;
  mapAnchor?: [number, number];
}

export interface RoomChoiceRecord {
  id: string;
  label: string;
  countryCode: string;
}

export interface RoundAnswerRecord {
  playerId: string;
  /** Milliseconds elapsed since the round started when the answer arrived. */
  elapsedMs: number;
  correct: boolean;
  pointsGained: number;
  streakBonus?: number;
  streakAfter: number;
  distanceKm?: number | null;
}

export interface RoundResultPlayer {
  playerId: string;
  correct: boolean;
  elapsedMs: number;
  pointsGained: number;
  streakBonus?: number;
  streakAfter: number;
  distanceKm?: number | null;
}

export interface RoundResult {
  fastestPlayerId: string | null;
  closestPinPlayerId?: string | null;
  closestPinDistanceKm?: number | null;
  players: RoundResultPlayer[];
}

export interface RoomRoundRecord {
  missionId: string;
  number: number;
  targetCountryCode: string;
  targetCountryName: string;
  targetRegion?: string;
  targetMapAnchor?: [number, number] | null;
  prompt: PublicPrompt;
  choices: RoomChoiceRecord[];
  revealed: boolean;
  answerReveal: { countryCode: string; countryName: string } | null;
  /** Absent on rounds persisted before round timing existed. */
  startedAt?: number | null;
  deadlineAt?: number | null;
  answers?: RoundAnswerRecord[];
}

export interface RoomGameRecord {
  startedAt: number | null;
  timerDeadlineAt: number | null;
  advanceAt: number | null;
  round: RoomRoundRecord | null;
  usedCountryCodes: string[];
}

export interface RoomRecord {
  roomId: string;
  revision: number;
  status: RoomStatus;
  visibility?: RoomVisibility;
  adminPlayerId: string;
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  players: RoomPlayerRecord[];
  game: RoomGameRecord;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomPlayerSnapshot {
  id: string;
  name: string;
  isAdmin: boolean;
  ready: boolean;
  connected: boolean;
  score: number;
  streak: number;
  maxStreak: number;
  pinLocation: [number, number] | null;
  answered: boolean;
  lockedOut?: boolean;
  powerUps?: PlayerPowerUps;
  doubleActive?: boolean;
  hiddenChoiceIds?: string[];
  hint?: string | null;
}

export interface RoomSnapshot {
  roomId: string;
  revision: number;
  status: RoomStatus;
  visibility: RoomVisibility;
  adminPlayerId: string;
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  players: RoomPlayerSnapshot[];
  game: {
    startedAt: number | null;
    timerDeadlineAt: number | null;
    round: {
      missionId: string;
      number: number;
      prompt: PublicPrompt;
      choices: Array<Pick<RoomChoiceRecord, 'id' | 'label'>>;
      revealed: boolean;
      answerReveal: { countryCode: string; countryName: string } | null;
      startedAt: number | null;
      deadlineAt: number | null;
      result: RoundResult | null;
    } | null;
  };
}

export interface RoomCreateRequest {
  requestId: string;
  playerName: string;
  visibility?: RoomVisibility;
  config?: RoomConfiguration;
}

export interface RoomJoinRequest {
  requestId: string;
  roomId: string;
  playerName: string;
}

export interface RoomReconnectRequest {
  requestId: string;
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

export type RoomCommandInput =
  | {
      type: 'answer';
      answerCountryCode: string | null;
      choiceId?: string;
      pinLocation?: [number, number];
    }
  | {
      type: 'powerup';
      kind: PowerUpKind;
    }
  | { type: 'reveal' }
  | { type: 'skip' };

export interface RoomReactionEvent {
  roomId: string;
  playerId: string;
  playerName: string;
  emoji: ReactionEmoji;
  timestamp: number;
}

export type RoomCommand = RoomCommandInput & {
  commandId: number;
  expectedRevision: number;
  missionId: string;
};

export interface RoomJoinResult {
  playerId: string;
  reconnectToken: string;
  nextCommandId: number;
  snapshot: RoomSnapshot;
}

export interface RoomCommandResult {
  snapshot: RoomSnapshot;
  accepted: boolean;
  reason?: 'invalid-command' | 'stale-revision' | 'stale-mission' | 'duplicate' | 'not-allowed';
}
