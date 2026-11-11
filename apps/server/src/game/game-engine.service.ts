import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type {
  RoomConfiguration,
  RoomRoundRecord,
  SubMode,
} from '../rooms/domain/room.types.js';
import type { CountryRecord } from './country-catalog.service.js';
import {
  UNINHABITED_OUTPOST_CODES,
  getCountryTier,
  getTierNumber,
  resolveTargetDifficultyTier,
  selectCandidatesForTier,
} from './country-difficulty.js';

export interface RoundCreation {
  round: RoomRoundRecord;
  usedCountryCodes: string[];
  lapWrapped: boolean;
}

@Injectable()
export class GameEngineService {
  createRound(
    config: RoomConfiguration,
    countries: CountryRecord[],
    usedCountryCodes: string[],
    roundNumber: number,
    choicesPerRound: number,
    legNumber = 1,
  ): RoundCreation | null {
    const usedCodes = new Set(usedCountryCodes);
    const needsMapAnchor =
      config.mode === 'reverse' ||
      (config.mode === 'pin' && config.pinDirection === 'identify');
    let candidates = countries.filter(
      (country) =>
        !usedCodes.has(country.cca3) &&
        (!needsMapAnchor || country.mapAnchor !== null),
    );
    let lapWrapped = false;

    if (candidates.length === 0 && config.challengeType !== 'world') {
      candidates = countries.filter(
        (country) => !needsMapAnchor || country.mapAnchor !== null,
      );
      if (usedCodes.size > 0 && candidates.length > 0) {
        lapWrapped = true;
      }
      usedCodes.clear();
    }
    if (candidates.length === 0) return null;

    const targetTier = resolveTargetDifficultyTier(config, roundNumber, legNumber);
    const tieredCandidates = selectCandidatesForTier(
      candidates,
      targetTier,
      config,
      roundNumber,
    );
    const target = tieredCandidates[randomInt(tieredCandidates.length)];
    if (!target) return null;

    const difficultyTier = getCountryTier(target.cca3);
    const needsChoices =
      config.mode === 'reverse' ||
      (config.mode === 'pin' && config.pinDirection === 'identify');
    const choices = needsChoices
      ? this.createChoices(target, countries, choicesPerRound, config.subMode)
      : [];
    const prompt = this.createPrompt(config, target);

    return {
      round: {
        missionId: randomUUID(),
        number: roundNumber,
        difficultyTier,
        targetCountryCode: target.cca3,
        targetCountryName: target.name,
        targetRegion: target.region,
        targetSubregion: target.subregion,
        targetCapital: target.capitals[0] ?? '',
        targetFlag: target.flag,
        targetMapAnchor: target.mapAnchor,
        prompt,
        choices,
        revealed: false,
        answerReveal: null,
      },
      usedCountryCodes: [...usedCodes, target.cca3],
      lapWrapped,
    };
  }

  private createPrompt(
    config: RoomConfiguration,
    country: CountryRecord,
  ): RoomRoundRecord['prompt'] {
    if (
      config.mode === 'reverse' ||
      (config.mode === 'pin' && config.pinDirection === 'identify')
    ) {
      return {
        type: 'instruction',
        value:
          config.mode === 'pin'
            ? 'Identify the country shown on the map'
            : 'Identify the highlighted country',
        mapAnchor: country.mapAnchor ?? undefined,
      };
    }

    if (config.subMode === 'flag') {
      const flagCode = country.cca2.trim().toLowerCase();
      return {
        type: 'flag',
        value: country.flag || 'Flag',
        ...(flagCode ? { flagCode } : {}),
      };
    }
    if (config.subMode === 'capital') {
      return {
        type: 'text',
        value: country.capitals[0] ?? 'No capital',
      };
    }
    return { type: 'text', value: country.name };
  }

  private createChoices(
    target: CountryRecord,
    countries: CountryRecord[],
    choiceCount: number,
    subMode: SubMode,
  ): RoomRoundRecord['choices'] {
    const allDistractors = countries.filter(
      (country) => country.cca3 !== target.cca3,
    );
    const nonOutpostDistractors = allDistractors.filter(
      (country) => !UNINHABITED_OUTPOST_CODES.has(country.cca3.toUpperCase()),
    );
    const pool =
      nonOutpostDistractors.length >= choiceCount - 1
        ? nonOutpostDistractors
        : allDistractors;

    const targetTierNum = getTierNumber(getCountryTier(target.cca3));
    const isSimilarTier = (country: CountryRecord): boolean =>
      Math.abs(getTierNumber(getCountryTier(country.cca3)) - targetTierNum) <= 1;
    const isSameSubregion = (country: CountryRecord): boolean =>
      Boolean(target.subregion) && country.subregion === target.subregion;
    const isSameRegion = (country: CountryRecord): boolean =>
      Boolean(target.region) && country.region === target.region;

    const buckets: CountryRecord[][] = [
      [], // 0: Same subregion + similar tier
      [], // 1: Same region + similar tier
      [], // 2: Same subregion or region
      [], // 3: Similar tier globally
      [], // 4: Any remaining country
    ];

    for (const country of pool) {
      if (isSameSubregion(country) && isSimilarTier(country)) {
        buckets[0]!.push(country);
      } else if (isSameRegion(country) && isSimilarTier(country)) {
        buckets[1]!.push(country);
      } else if (isSameSubregion(country) || isSameRegion(country)) {
        buckets[2]!.push(country);
      } else if (isSimilarTier(country)) {
        buckets[3]!.push(country);
      } else {
        buckets[4]!.push(country);
      }
    }

    const selected = [target];
    for (const bucket of buckets) {
      while (selected.length < choiceCount && bucket.length > 0) {
        const index = randomInt(bucket.length);
        const [country] = bucket.splice(index, 1);
        if (country) selected.push(country);
      }
      if (selected.length >= choiceCount) break;
    }

    return selected
      .map((country) => {
        const flagCode =
          subMode === 'flag' ? country.cca2.trim().toLowerCase() : '';
        return {
          id: randomUUID(),
          label: this.getChoiceLabel(country, subMode),
          ...(flagCode ? { flagCode } : {}),
          countryCode: country.cca3,
        };
      })
      .sort((first, second) => first.label.localeCompare(second.label));
  }

  private getChoiceLabel(
    country: CountryRecord,
    subMode: SubMode,
  ): string {
    if (subMode === 'flag') return country.flag;
    if (subMode === 'capital') return country.capitals[0] ?? 'No capital';
    return country.name;
  }
}
