import { getLegDifficultyTier } from '../../game/country-difficulty.js';
import { RoomDomainError } from './room-errors.js';
import type {
  RoomConfiguration,
  RoomRecord,
  RoomSettingsVoteRecord,
  RoomSettingsVoteResolvedEvent,
  RoomSettingsVoteSnapshot,
  SettingsVoteOutcome,
} from './room.types.js';

export interface SettingsVoteResolution {
  outcome: SettingsVoteOutcome;
  vote: RoomSettingsVoteRecord;
  queued: boolean;
}

export const toSettingsVoteResolvedEvent = (
  roomId: string,
  resolution: SettingsVoteResolution,
): RoomSettingsVoteResolvedEvent => ({
  roomId,
  voteId: resolution.vote.voteId,
  outcome: resolution.outcome,
  proposerPlayerId: resolution.vote.proposerPlayerId,
  proposerName: resolution.vote.proposerName,
  proposedConfig: { ...resolution.vote.proposedConfig },
  queued: resolution.queued,
});

export const normalizeRoomConfiguration = (
  config: RoomConfiguration,
): RoomConfiguration => ({
  mode: config.mode,
  pinDirection: config.mode === 'pin' ? config.pinDirection : 'locate',
  subMode: config.subMode,
  challengeType: config.challengeType,
  challengeValue: config.challengeType === 'world' ? 0 : config.challengeValue,
  endless: config.endless !== false,
  difficulty: config.difficulty ?? 'progressive',
  roundTimeLimitSeconds: config.roundTimeLimitSeconds ?? 20,
  speedScoring: config.speedScoring !== false,
  wrongAnswerPenalty: config.wrongAnswerPenalty ?? 0,
});

export const areRoomConfigurationsEqual = (
  first: RoomConfiguration,
  second: RoomConfiguration,
): boolean => {
  const a = normalizeRoomConfiguration(first);
  const b = normalizeRoomConfiguration(second);
  return (
    a.mode === b.mode &&
    a.pinDirection === b.pinDirection &&
    a.subMode === b.subMode &&
    a.challengeType === b.challengeType &&
    a.challengeValue === b.challengeValue &&
    a.endless === b.endless &&
    a.difficulty === b.difficulty &&
    a.roundTimeLimitSeconds === b.roundTimeLimitSeconds &&
    a.speedScoring === b.speedScoring &&
    a.wrongAnswerPenalty === b.wrongAnswerPenalty
  );
};

export const getVoteEligiblePlayerIds = (room: RoomRecord): string[] =>
  room.players
    .filter((player) => player.connected && !player.paused)
    .map((player) => player.playerId);

export const getVoteRequiredYes = (eligibleCount: number): number =>
  Math.floor(eligibleCount / 2) + 1;

export const toSettingsVoteSnapshot = (
  room: RoomRecord,
): RoomSettingsVoteSnapshot | null => {
  const vote = room.settingsVote;
  if (!vote) return null;
  const eligibleIds = new Set(getVoteEligiblePlayerIds(room));
  const eligibleCount = eligibleIds.size;
  return {
    voteId: vote.voteId,
    proposerPlayerId: vote.proposerPlayerId,
    proposerName: vote.proposerName,
    proposedConfig: { ...vote.proposedConfig },
    yesPlayerIds: vote.yesPlayerIds.filter((id) => eligibleIds.has(id)),
    noPlayerIds: vote.noPlayerIds.filter((id) => eligibleIds.has(id)),
    requiredYes: getVoteRequiredYes(eligibleCount),
    eligibleCount,
    createdAt: vote.createdAt,
    expiresAt: vote.expiresAt,
  };
};

export const applyValidatedRoomSettings = (
  room: RoomRecord,
  nextConfig: RoomConfiguration,
): boolean => {
  if (
    room.status === 'waiting' ||
    room.status === 'finished' ||
    room.status === 'checkpoint'
  ) {
    room.config = nextConfig;
    room.pendingConfig = null;
    if (room.status === 'checkpoint' && room.game.checkpointSummary) {
      room.game.checkpointSummary.nextLegTier = getLegDifficultyTier(
        nextConfig,
        room.game.checkpointSummary.nextLegNumber,
      );
    }
    return false;
  }

  if (room.status !== 'playing') {
    throw new RoomDomainError('ROOM_NOT_STARTABLE');
  }

  room.pendingConfig = nextConfig;
  return true;
};

const applyCooldown = (
  room: RoomRecord,
  proposerPlayerId: string,
  now: number,
  cooldownMs: number,
): void => {
  if (cooldownMs <= 0) return;
  const proposer = room.players.find(
    (player) => player.playerId === proposerPlayerId,
  );
  if (proposer) {
    proposer.settingsVoteCooldownUntil = now + cooldownMs;
  }
};

export const reconcileSettingsVote = (
  room: RoomRecord,
  now: number,
  cooldownMs: number,
): SettingsVoteResolution | null => {
  const vote = room.settingsVote;
  if (!vote) return null;

  const eligibleIds = new Set(getVoteEligiblePlayerIds(room));
  vote.yesPlayerIds = [...new Set(vote.yesPlayerIds)].filter((id) =>
    eligibleIds.has(id),
  );
  vote.noPlayerIds = [...new Set(vote.noPlayerIds)].filter(
    (id) => eligibleIds.has(id) && !vote.yesPlayerIds.includes(id),
  );

  const eligibleCount = eligibleIds.size;
  if (eligibleCount < 2) {
    room.settingsVote = null;
    return { outcome: 'cancelled', vote, queued: false };
  }

  const requiredYes = getVoteRequiredYes(eligibleCount);
  if (vote.yesPlayerIds.length >= requiredYes) {
    const queued = applyValidatedRoomSettings(room, vote.proposedConfig);
    room.settingsVote = null;
    return { outcome: 'passed', vote, queued };
  }

  const maxAllowedNo = eligibleCount - requiredYes;
  if (vote.noPlayerIds.length > maxAllowedNo) {
    applyCooldown(room, vote.proposerPlayerId, now, cooldownMs);
    room.settingsVote = null;
    return { outcome: 'rejected', vote, queued: false };
  }

  if (now >= vote.expiresAt) {
    applyCooldown(room, vote.proposerPlayerId, now, cooldownMs);
    room.settingsVote = null;
    return { outcome: 'expired', vote, queued: false };
  }

  return null;
};
