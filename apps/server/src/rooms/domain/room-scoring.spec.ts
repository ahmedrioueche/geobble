import { describe, expect, it } from 'vitest';
import {
  calculateClosestPinBonus,
  calculateGreatCircleDistanceKm,
  calculateRoundPoints,
} from './room-scoring.js';

describe('room scoring', () => {
  it('scales base points down to 50% over the round time limit and adds streak bonus', () => {
    const instant = calculateRoundPoints({
      basePoints: 100,
      streak: 2,
      streakBonusPoints: 5,
      elapsedMs: 0,
      roundTimeLimitMs: 20_000,
    });
    expect(instant).toEqual({
      basePointsEarned: 100,
      streakBonus: 10,
      totalPoints: 110,
    });

    const halfway = calculateRoundPoints({
      basePoints: 100,
      streak: 2,
      streakBonusPoints: 5,
      elapsedMs: 10_000,
      roundTimeLimitMs: 20_000,
    });
    expect(halfway).toEqual({
      basePointsEarned: 75,
      streakBonus: 10,
      totalPoints: 85,
    });

    const atDeadline = calculateRoundPoints({
      basePoints: 100,
      streak: 0,
      streakBonusPoints: 5,
      elapsedMs: 25_000,
      roundTimeLimitMs: 20_000,
    });
    expect(atDeadline).toEqual({
      basePointsEarned: 50,
      streakBonus: 0,
      totalPoints: 50,
    });
  });

  it('keeps flat points when speed scoring is disabled or timer is 0, and supports double points', () => {
    const flat = calculateRoundPoints({
      basePoints: 10,
      streak: 1,
      streakBonusPoints: 5,
      elapsedMs: 15_000,
      roundTimeLimitMs: 0,
    });
    expect(flat.totalPoints).toBe(15);

    const doubled = calculateRoundPoints({
      basePoints: 10,
      streak: 1,
      streakBonusPoints: 5,
      elapsedMs: 0,
      roundTimeLimitMs: 20_000,
      doublePointsActive: true,
    });
    expect(doubled.totalPoints).toBe(30);
  });

  it('computes haversine distance and closest-pin partial bonus bands', () => {
    expect(calculateGreatCircleDistanceKm([2.35, 48.85], [2.35, 48.85])).toBe(0);
    const parisToBrussels = calculateGreatCircleDistanceKm(
      [2.3522, 48.8566],
      [4.3517, 50.8503],
    );
    expect(parisToBrussels).toBeGreaterThan(250);
    expect(parisToBrussels).toBeLessThan(280);

    expect(calculateClosestPinBonus(260, 100)).toBe(25);
    expect(calculateClosestPinBonus(800, 100)).toBe(10);
    expect(calculateClosestPinBonus(1500, 100)).toBe(0);
  });
});

