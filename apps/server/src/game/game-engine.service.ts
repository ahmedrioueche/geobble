import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type {
  RoomConfiguration,
  RoomRoundRecord,
  SubMode,
} from '../rooms/domain/room.types.js';
import type { CountryRecord } from './country-catalog.service.js';

export interface RoundCreation {
  round: RoomRoundRecord;
  usedCountryCodes: string[];
}

@Injectable()
export class GameEngineService {
  createRound(
    config: RoomConfiguration,
    countries: CountryRecord[],
    usedCountryCodes: string[],
    roundNumber: number,
    choicesPerRound: number,
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

    if (candidates.length === 0 && config.challengeType !== 'world') {
      candidates = countries.filter(
        (country) => !needsMapAnchor || country.mapAnchor !== null,
      );
      usedCodes.clear();
    }
    if (candidates.length === 0) return null;

    const target = candidates[randomInt(candidates.length)];
    if (!target) return null;

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
        targetCountryCode: target.cca3,
        targetCountryName: target.name,
        targetRegion: target.region,
        targetMapAnchor: target.mapAnchor,
        prompt,
        choices,
        revealed: false,
        answerReveal: null,
      },
      usedCountryCodes: [...usedCodes, target.cca3],
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
      return { type: 'flag', value: country.flag };
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
    const distractors = countries.filter(
      (country) => country.cca3 !== target.cca3,
    );
    const selected = [target];

    while (selected.length < choiceCount && distractors.length > 0) {
      const index = randomInt(distractors.length);
      const [country] = distractors.splice(index, 1);
      if (country) selected.push(country);
    }

    return selected
      .map((country) => ({
        id: randomUUID(),
        label: this.getChoiceLabel(country, subMode),
        countryCode: country.cca3,
      }))
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
