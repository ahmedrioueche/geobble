export interface SpeedScoringOptions {
  basePoints: number;
  streak: number;
  streakBonusPoints: number;
  elapsedMs: number;
  roundTimeLimitMs: number;
  speedScoringEnabled?: boolean;
  minSpeedMultiplier?: number;
  doublePointsActive?: boolean;
}

export interface CalculatedRoundPoints {
  basePointsEarned: number;
  streakBonus: number;
  totalPoints: number;
}

export const calculateRoundPoints = ({
  basePoints,
  streak,
  streakBonusPoints,
  elapsedMs,
  roundTimeLimitMs,
  speedScoringEnabled = true,
  minSpeedMultiplier = 0.5,
  doublePointsActive = false,
}: SpeedScoringOptions): CalculatedRoundPoints => {
  const clampedMin = Math.max(0, Math.min(1, minSpeedMultiplier));
  let speedMultiplier = 1;
  if (speedScoringEnabled && roundTimeLimitMs > 0) {
    const progress = Math.max(
      0,
      Math.min(1, elapsedMs / roundTimeLimitMs),
    );
    speedMultiplier = 1 - progress * (1 - clampedMin);
  }

  const basePointsEarned = Math.max(
    1,
    Math.round(basePoints * speedMultiplier),
  );
  const streakBonus = Math.max(0, streak * streakBonusPoints);
  const rawTotal = basePointsEarned + streakBonus;
  const totalPoints = doublePointsActive ? rawTotal * 2 : rawTotal;

  return {
    basePointsEarned,
    streakBonus,
    totalPoints,
  };
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const calculateGreatCircleDistanceKm = (
  first: [number, number],
  second: [number, number],
): number => {
  const [lon1, lat1] = first;
  const [lon2, lat2] = second;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(radLat1) * Math.cos(radLat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return Math.round(EARTH_RADIUS_KM * c);
};

export const calculateClosestPinBonus = (
  distanceKm: number,
  basePoints: number,
): number => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (distanceKm <= 300) {
    return Math.max(1, Math.round(basePoints * 0.25));
  }
  if (distanceKm <= 1000) {
    return Math.max(1, Math.round(basePoints * 0.1));
  }
  return 0;
};

