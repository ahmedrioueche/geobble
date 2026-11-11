export type GameMode = 'identify' | 'reverse' | 'pin';
export type PinDirection = 'locate' | 'identify';
export type SubMode = 'name' | 'flag' | 'capital';
export type ChallengeType = 'world' | 'count' | 'timer';
export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert';
export type DifficultyMode = 'progressive' | DifficultyTier;
export type RoomStatus = 'waiting' | 'playing' | 'checkpoint' | 'finished';
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
  endless?: boolean;
  difficulty?: DifficultyMode;
  roundTimeLimitSeconds?: number;
  speedScoring?: boolean;
  wrongAnswerPenalty?: number;
}

export const DEFAULT_ROOM_CONFIGURATION: RoomConfiguration = {
  mode: 'identify',
  pinDirection: 'locate',
  subMode: 'name',
  challengeType: 'count',
  challengeValue: 2,
  endless: true,
  difficulty: 'progressive',
  roundTimeLimitSeconds: 20,
  speedScoring: true,
  wrongAnswerPenalty: 0,
};

export interface RoomPlayerRecord {
  playerId: string;
  name: string;
  connected: boolean;
  paused?: boolean;
  pausedAt?: number | null;
  lastActiveAt?: number;
  missedRoundsCount?: number;
  spectatorPromptDeadlineAt?: number | null;
  joinedAt: number;
  disconnectedAt: number | null;
  reconnectTokenHash: string;
  score: number;
  legScore?: number;
  checkpointsWon?: number;
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
  settingsVoteCooldownUntil?: number | null;
}

export interface PublicPrompt {
  type: 'text' | 'flag' | 'instruction';
  value: string;
  flagCode?: string;
  mapAnchor?: [number, number];
}

export interface RoomChoiceRecord {
  id: string;
  label: string;
  flagCode?: string;
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
  difficultyTier?: DifficultyTier;
  targetCountryCode: string;
  targetCountryName: string;
  targetRegion?: string;
  targetSubregion?: string;
  targetCapital?: string;
  targetFlag?: string;
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

export interface CheckpointSummary {
  legNumber: number;
  roundsInLeg: number;
  winnerIds: string[];
  topLegScore: number;
  nextLegNumber: number;
  nextLegTier: DifficultyTier;
  nextLegMultiplier: number;
  lapNumber: number;
}

export interface RoomGameRecord {
  startedAt: number | null;
  timerDeadlineAt: number | null;
  advanceAt: number | null;
  legNumber?: number;
  legRoundNumber?: number;
  lapNumber?: number;
  legMultiplier?: number;
  legTier?: DifficultyTier;
  checkpointResumeAt?: number | null;
  checkpointPaused?: boolean;
  pausedCheckpointRemainingMs?: number | null;
  checkpointSummary?: CheckpointSummary | null;
  paused?: boolean;
  pausedAt?: number | null;
  pauseDeadlineAt?: number | null;
  pausedRoundRemainingMs?: number | null;
  pausedTimerRemainingMs?: number | null;
  pausedAdvanceRemainingMs?: number | null;
  round: RoomRoundRecord | null;
  usedCountryCodes: string[];
}

export type SettingsVoteOutcome =
  | 'passed'
  | 'rejected'
  | 'expired'
  | 'superseded'
  | 'cancelled';

export interface RoomSettingsVoteRecord {
  voteId: string;
  proposerPlayerId: string;
  proposerName: string;
  proposedConfig: RoomConfiguration;
  yesPlayerIds: string[];
  noPlayerIds: string[];
  createdAt: number;
  expiresAt: number;
}

export interface RoomSettingsVoteSnapshot extends RoomSettingsVoteRecord {
  requiredYes: number;
  eligibleCount: number;
}

export interface RoomSettingsVoteResolvedEvent {
  roomId: string;
  voteId: string;
  outcome: SettingsVoteOutcome;
  proposerPlayerId: string;
  proposerName: string;
  proposedConfig: RoomConfiguration;
  queued: boolean;
}

export interface RoomRecord {
  roomId: string;
  revision: number;
  status: RoomStatus;
  visibility?: RoomVisibility;
  secret?: string | null;
  secretHash?: string | null;
  adminPlayerId: string;
  config: RoomConfiguration;
  pendingConfig: RoomConfiguration | null;
  settingsVote?: RoomSettingsVoteRecord | null;
  players: RoomPlayerRecord[];
  game: RoomGameRecord;
  lastActivityAt?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomPlayerSnapshot {
  id: string;
  name: string;
  isAdmin: boolean;
  connected: boolean;
  paused?: boolean;
  spectatorPromptDeadlineAt?: number | null;
  score: number;
  legScore?: number;
  checkpointsWon?: number;
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
  settingsVote?: RoomSettingsVoteSnapshot | null;
  players: RoomPlayerSnapshot[];
  game: {
    startedAt: number | null;
    timerDeadlineAt: number | null;
    legNumber?: number;
    legRoundNumber?: number;
    lapNumber?: number;
    legMultiplier?: number;
    legTier?: DifficultyTier;
    checkpointResumeAt?: number | null;
    checkpointPaused?: boolean;
    checkpointSummary?: CheckpointSummary | null;
    paused?: boolean;
    pauseDeadlineAt?: number | null;
    round: {
      missionId: string;
      number: number;
      difficultyTier?: DifficultyTier;
      prompt: PublicPrompt;
      choices: Array<Pick<RoomChoiceRecord, 'id' | 'label' | 'flagCode'>>;
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
  secret?: string;
  config?: RoomConfiguration;
}

export interface RoomJoinRequest {
  requestId: string;
  roomId: string;
  playerName: string;
  secret?: string;
}

export interface RoomInspectRequest {
  requestId: string;
  roomId: string;
}

export interface RoomInspectResult {
  roomId: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  requiresSecret: boolean;
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
  roomSecret?: string;
}

export interface RoomCommandResult {
  snapshot: RoomSnapshot;
  accepted: boolean;
  reason?: 'invalid-command' | 'stale-revision' | 'stale-mission' | 'duplicate' | 'not-allowed';
}
