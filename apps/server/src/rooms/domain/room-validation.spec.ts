import { describe, expect, it } from 'vitest';
import { RoomDomainError } from './room-errors.js';
import {
  parseInspectRequest,
  parseRoomCommand,
  parseRoomConfiguration,
  parseCreateRequest,
  parseJoinRequest,
  parseReconnectRequest,
} from './room-validation.js';

describe('room request validation', () => {
  it('accepts supported configurations and normalizes irrelevant pin direction', () => {
    expect(
      parseRoomConfiguration({
        mode: 'reverse',
        pinDirection: 'locate',
        subMode: 'flag',
        challengeType: 'count',
        challengeValue: 20,
      }),
    ).toEqual({
      mode: 'reverse',
      pinDirection: 'locate',
      subMode: 'flag',
      challengeType: 'count',
      challengeValue: 20,
    });
  });

  it('rejects invalid combinations and challenge values', () => {
    expect(() =>
      parseRoomConfiguration({
        mode: 'identify',
        pinDirection: 'unsupported',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
      }),
    ).toThrow(RoomDomainError);
    expect(() =>
      parseRoomConfiguration({
        mode: 'pin',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 2,
      }),
    ).toThrow(RoomDomainError);
  });

  it('validates create, join, and reconnect payloads without accepting client identity on create', () => {
    expect(
      parseCreateRequest({
        requestId: 'request-1',
        playerName: ' Ada ',
        playerId: 'client-controlled',
      }),
    ).toEqual({
      requestId: 'request-1',
      playerName: 'Ada',
      visibility: 'private',
    });
    expect(
      parseCreateRequest({
        requestId: 'request-1',
        playerName: 'Ada',
        visibility: 'public',
      }).visibility,
    ).toBe('public');
    expect(() =>
      parseCreateRequest({
        requestId: 'request-1',
        playerName: 'Ada',
        visibility: 'unlisted',
      }),
    ).toThrow(RoomDomainError);
    expect(
      parseJoinRequest({
        requestId: 'request-2',
        roomId: '0042',
        playerName: 'Grace',
      }),
    ).toMatchObject({ roomId: '0042', playerName: 'Grace' });
    expect(
      parseJoinRequest({
        requestId: 'request-2',
        roomId: '123456',
        playerName: 'Grace',
      }),
    ).toMatchObject({ roomId: '123456', playerName: 'Grace' });
    expect(
      parseJoinRequest({
        requestId: 'request-2',
        roomId: 'ab23cd',
        playerName: 'Grace',
      }),
    ).toMatchObject({ roomId: 'AB23CD', playerName: 'Grace' });
    expect(
      parseReconnectRequest({
        requestId: 'request-3',
        roomId: 'ab23cd',
        playerId: 'player-id',
        reconnectToken: 'a'.repeat(43),
      }),
    ).toMatchObject({ roomId: 'AB23CD', playerId: 'player-id' });

    expect(
      parseCreateRequest({
        requestId: 'request-4',
        playerName: 'Ada',
        visibility: 'private',
        secret: '  alpha9  ',
      }),
    ).toMatchObject({ visibility: 'private', secret: 'alpha9' });
    expect(
      parseCreateRequest({
        requestId: 'request-4',
        playerName: 'Ada',
        visibility: 'private',
        secret: '   ',
      }).secret,
    ).toBeUndefined();
    expect(() =>
      parseCreateRequest({
        requestId: 'request-4',
        playerName: 'Ada',
        visibility: 'private',
        secret: 'ab',
      }),
    ).toThrow(RoomDomainError);
    expect(
      parseJoinRequest({
        requestId: 'request-5',
        roomId: '4821',
        playerName: 'Grace',
        secret: ' K7M9P2 ',
      }),
    ).toMatchObject({ roomId: '4821', playerName: 'Grace', secret: 'K7M9P2' });
    expect(
      parseInspectRequest({
        requestId: 'request-6',
        roomId: ' 4821 ',
      }),
    ).toEqual({ requestId: 'request-6', roomId: '4821' });
  });

  it('rejects malformed, oversized, and unsafe command payloads', () => {
    expect(() =>
      parseRoomCommand({
        type: 'answer',
        commandId: 1,
        expectedRevision: 0,
        missionId: 'mission-1',
        answerCountryCode: 'TOOLONG',
      }),
    ).toThrow(RoomDomainError);
    expect(() =>
      parseRoomCommand({
        type: 'answer',
        commandId: 1.5,
        expectedRevision: 0,
        missionId: 'mission-1',
        answerCountryCode: 'CAN',
      }),
    ).toThrow(RoomDomainError);
  });

  it('validates pin guesses as longitude-latitude coordinates', () => {
    expect(
      parseRoomCommand({
        type: 'answer',
        commandId: 1,
        expectedRevision: 0,
        missionId: 'mission-1',
        answerCountryCode: 'CAN',
        pinLocation: [-100, 50],
      }),
    ).toMatchObject({ pinLocation: [-100, 50] });
    expect(() =>
      parseRoomCommand({
        type: 'answer',
        commandId: 1,
        expectedRevision: 0,
        missionId: 'mission-1',
        answerCountryCode: 'CAN',
        pinLocation: [-100, 91],
      }),
    ).toThrow(RoomDomainError);
  });

  it('validates power-up commands, optional round settings, and reaction emojis', () => {
    expect(
      parseRoomCommand({
        type: 'powerup',
        kind: 'fifty',
        commandId: 2,
        expectedRevision: 1,
        missionId: 'mission-1',
      }),
    ).toEqual({
      type: 'powerup',
      kind: 'fifty',
      commandId: 2,
      expectedRevision: 1,
      missionId: 'mission-1',
    });

    expect(() =>
      parseRoomCommand({
        type: 'powerup',
        kind: 'unknown',
        commandId: 2,
        expectedRevision: 1,
        missionId: 'mission-1',
      }),
    ).toThrow(RoomDomainError);

    expect(
      parseRoomConfiguration({
        mode: 'identify',
        pinDirection: 'locate',
        subMode: 'name',
        challengeType: 'world',
        challengeValue: 0,
        roundTimeLimitSeconds: 15,
        speedScoring: false,
        wrongAnswerPenalty: 5,
      }),
    ).toMatchObject({
      roundTimeLimitSeconds: 15,
      speedScoring: false,
      wrongAnswerPenalty: 5,
    });
  });
});
