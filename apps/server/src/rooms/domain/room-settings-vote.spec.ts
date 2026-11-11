import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_POWER_UPS,
  DEFAULT_ROOM_CONFIGURATION,
  type RoomPlayerRecord,
  type RoomRecord,
} from './room.types.js';
import {
  areRoomConfigurationsEqual,
  getVoteRequiredYes,
  reconcileSettingsVote,
} from './room-settings-vote.js';

const createPlayer = (
  id: string,
  overrides: Partial<RoomPlayerRecord> = {},
): RoomPlayerRecord => ({
  playerId: id,
  name: id,
  connected: true,
  paused: false,
  joinedAt: 1,
  disconnectedAt: null,
  reconnectTokenHash: 'hash',
  score: 0,
  streak: 0,
  maxStreak: 0,
  pinLocation: null,
  answeredMissionId: null,
  lastCommandId: 0,
  powerUps: { ...DEFAULT_PLAYER_POWER_UPS },
  ...overrides,
});

const createRoom = (players: RoomPlayerRecord[]): RoomRecord => ({
  roomId: '1234',
  revision: 1,
  status: 'waiting',
  visibility: 'private',
  adminPlayerId: players[0]?.playerId ?? 'p1',
  config: { ...DEFAULT_ROOM_CONFIGURATION },
  pendingConfig: null,
  settingsVote: {
    voteId: 'v1',
    proposerPlayerId: players[0]?.playerId ?? 'p1',
    proposerName: players[0]?.name ?? 'p1',
    proposedConfig: { ...DEFAULT_ROOM_CONFIGURATION, subMode: 'flag' },
    yesPlayerIds: [players[0]?.playerId ?? 'p1'],
    noPlayerIds: [],
    createdAt: 1_000,
    expiresAt: 26_000,
  },
  players,
  game: {
    startedAt: null,
    timerDeadlineAt: null,
    advanceAt: null,
    round: null,
    usedCountryCodes: [],
  },
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('room-settings-vote', () => {
  it('computes strict majority thresholds accurately', () => {
    expect(getVoteRequiredYes(2)).toBe(2);
    expect(getVoteRequiredYes(3)).toBe(2);
    expect(getVoteRequiredYes(4)).toBe(3);
    expect(getVoteRequiredYes(5)).toBe(3);
  });

  it('normalizes optional defaults when comparing configurations', () => {
    expect(
      areRoomConfigurationsEqual(
        {
          mode: 'identify',
          pinDirection: 'locate',
          subMode: 'name',
          challengeType: 'count',
          challengeValue: 5,
        },
        {
          mode: 'identify',
          pinDirection: 'identify',
          subMode: 'name',
          challengeType: 'count',
          challengeValue: 5,
          endless: true,
          difficulty: 'progressive',
          roundTimeLimitSeconds: 20,
          speedScoring: true,
          wrongAnswerPenalty: 0,
        },
      ),
    ).toBe(true);
  });

  it('rejects early when remaining voters cannot reach majority', () => {
    const room = createRoom([
      createPlayer('p1'),
      createPlayer('p2'),
      createPlayer('p3'),
    ]);
    room.settingsVote!.noPlayerIds = ['p2'];
    expect(reconcileSettingsVote(room, 5_000, 10_000)).toBeNull();

    // p3 disconnects -> 2 eligible left (p1 yes, p2 no) -> impossible for p1 to get 2/2
    room.players[2]!.connected = false;
    const resolution = reconcileSettingsVote(room, 5_500, 10_000);
    expect(resolution?.outcome).toBe('rejected');
    expect(room.settingsVote).toBeNull();
    expect(room.players[0]!.settingsVoteCooldownUntil).toBe(15_500);
  });

  it('cancels cleanly when eligible voters drop below 2', () => {
    const room = createRoom([createPlayer('p1'), createPlayer('p2', { paused: true })]);
    const resolution = reconcileSettingsVote(room, 5_000, 10_000);
    expect(resolution?.outcome).toBe('cancelled');
    expect(room.settingsVote).toBeNull();
  });
});

