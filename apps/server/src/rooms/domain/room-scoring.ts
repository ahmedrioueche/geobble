import type {
  RoomConfiguration,
  RoomRoundRecord,
} from './room.types.js';

export const buildRoundHint = (
  config: RoomConfiguration,
  round: Pick<
    RoomRoundRecord,
    | 'targetCountryName'
    | 'targetRegion'
    | 'targetSubregion'
    | 'targetCapital'
    | 'targetFlag'
    | 'prompt'
  >,
): string => {
  const isChoiceMode =
    config.mode === 'reverse' ||
    (config.mode === 'pin' && config.pinDirection === 'identify');
  const promptShowsCountryName =
    !isChoiceMode &&
    (config.subMode === 'name' ||
      (round.prompt.type === 'text' &&
        round.prompt.value.trim().toLowerCase() ===
          round.targetCountryName.trim().toLowerCase()));

  const regionLabel = [round.targetRegion, round.targetSubregion]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' — ');
  const regionPart = regionLabel ? `Region: ${regionLabel}` : '';
  const capital = round.targetCapital?.trim() ?? '';

  if (promptShowsCountryName) {
    // Player already has the country name and needs to find it on the map.
    const capitalPart = capital ? `Capital: ${capital}` : '';
    const flagPart = round.targetFlag?.trim()
      ? `Flag: ${round.targetFlag.trim()}`
      : '';
    return (
      [regionPart, capitalPart, flagPart].filter(Boolean).join(' · ') ||
      'Hint active'
    );
  }

  if (isChoiceMode) {
    // Player is picking among multiple choices; avoid giving away the choice label itself.
    if (config.subMode === 'capital') {
      return (
        [regionPart, `Country: ${round.targetCountryName}`]
          .filter(Boolean)
          .join(' · ') || 'Hint active'
      );
    }
    const capitalPart = capital ? `Capital: ${capital}` : '';
    return (
      [regionPart, capitalPart].filter(Boolean).join(' · ') || 'Hint active'
    );
  }

  // Flag or Capital prompt on map-click modes: player needs to deduce the country and locate it.
  const firstLetter = round.targetCountryName.trim().charAt(0).toUpperCase();
  const letterPart = firstLetter ? `Country starts with "${firstLetter}"` : '';
  const extraPart =
    config.subMode === 'flag' && capital ? `Capital: ${capital}` : '';
  return (
    [regionPart, extraPart, letterPart].filter(Boolean).join(' · ') ||
    'Hint active'
  );
};

export interface SpeedScoringOptions {
  basePoints: number;
  streak: number;
  streakBonusPoints: number;
  elapsedMs: number;
  roundTimeLimitMs: number;
  speedScoringEnabled?: boolean;
  minSpeedMultiplier?: number;
  doublePointsActive?: boolean;
  legMultiplier?: number;
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
  legMultiplier = 1,
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
  const multipliedTotal = Math.max(1, Math.round(rawTotal * Math.max(1, legMultiplier)));
  const totalPoints = doublePointsActive ? multipliedTotal * 2 : multipliedTotal;

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

