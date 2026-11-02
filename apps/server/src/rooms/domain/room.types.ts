export type GameMode = 'identify' | 'reverse' | 'pin';
export type PinDirection = 'locate' | 'identify';
export type SubMode = 'name' | 'flag' | 'capital';
export type ChallengeType = 'world' | 'count' | 'timer';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type RoomVisibility = 'public' | 'private';

export interface RoomConfiguration {
  mode: GameMode;
  pinDirection: PinDirection;
  subMode: SubMode;
  challengeType: ChallengeType;
  challengeValue: number;
}

export const DEFAULT_ROOM_CONFIGURATION: RoomConfiguration = {
  mode: 'identify',
  pinDirection: 'locate',
  subMode: 'name',
  challengeType: 'world',
  challengeValue: 0,
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

export interface RoomRoundRecord {
  missionId: string;
  number: number;
  targetCountryCode: string;
  targetCountryName: string;
  prompt: PublicPrompt;
  choices: RoomChoiceRecord[];
  revealed: boolean;
  answerReveal: { countryCode: string; countryName: string } | null;
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
  | { type: 'reveal' }
  | { type: 'skip' };

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
