import { describe, expect, it } from 'vitest';
import { toRoomSnapshot } from './room-snapshot.js';
import type { RoomRecord } from './room.types.js';

const room: RoomRecord = {
  roomId: 'ROOM42',
  revision: 3,
  status: 'playing',
  adminPlayerId: 'player-1',
  config: {
    mode: 'reverse',
    pinDirection: 'locate',
    subMode: 'name',
    challengeType: 'world',
    challengeValue: 0,
  },
  pendingConfig: null,
  players: [
    {
      playerId: 'player-1',
      name: 'Ada',
      ready: true,
      connected: true,
      joinedAt: 1,
      disconnectedAt: null,
      reconnectTokenHash: 'secret-hash',
      score: 0,
      streak: 0,
      maxStreak: 0,
      pinLocation: [-100, 50],
      answeredMissionId: null,
      lastCommandId: 0,
    },
  ],
  game: {
    startedAt: 1,
    timerDeadlineAt: null,
    advanceAt: null,
    usedCountryCodes: ['CAN'],
    round: {
      missionId: 'mission-1',
      number: 1,
      targetCountryCode: 'CAN',
      targetCountryName: 'Canada',
      prompt: {
        type: 'instruction',
        value: 'Identify the highlighted country',
        mapAnchor: [-106, 56],
      },
      choices: [{ id: 'choice-1', label: 'Canada', countryCode: 'CAN' }],
      revealed: false,
      answerReveal: null,
    },
  },
  expiresAt: new Date(1_000),
  createdAt: new Date(1),
  updatedAt: new Date(1),
};

describe('room snapshots', () => {
  it('never includes reconnect credentials or the target answer before reveal', () => {
    const snapshot = toRoomSnapshot(room);
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.visibility).toBe('private');
    expect(snapshot.game.round?.prompt.mapAnchor).toEqual([-106, 56]);
    expect(snapshot.game.round?.choices).toEqual([
      { id: 'choice-1', label: 'Canada' },
    ]);
    expect(serialized).not.toContain('reconnectTokenHash');
    expect(serialized).not.toContain('secret-hash');
    expect(serialized).not.toContain('targetCountryCode');
    expect(serialized).not.toContain('targetCountryName');
    expect(serialized).not.toContain('"countryCode":"CAN"');
  });
});
