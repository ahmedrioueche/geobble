import { describe, expect, it } from 'vitest';
import { GameEngineService } from './game-engine.service.js';
import type { CountryRecord } from './country-catalog.service.js';
import {
  getCountryStage,
  getCountryTier,
  resolveTargetDifficultyTier,
} from './country-difficulty.js';
import { DEFAULT_ROOM_CONFIGURATION } from '../rooms/domain/room.types.js';

const makeCountry = (
  cca3: string,
  name: string,
  region: string,
  subregion: string,
): CountryRecord => ({
  name,
  cca2: cca3.slice(0, 2),
  cca3,
  numericCode: '000',
  capitals: [`${name} City`],
  region,
  subregion,
  flag: cca3,
  mapAnchor: [10, 10],
});

const SAMPLE_COUNTRIES: CountryRecord[] = [
  // Stage 1 (Easy)
  makeCountry('FRA', 'France', 'Europe', 'Western Europe'),
  makeCountry('DEU', 'Germany', 'Europe', 'Western Europe'),
  // Stage 2 (Easy)
  makeCountry('CHE', 'Switzerland', 'Europe', 'Western Europe'),
  makeCountry('SWE', 'Sweden', 'Europe', 'Northern Europe'),
  // Stage 3 (Medium)
  makeCountry('AUT', 'Austria', 'Europe', 'Western Europe'),
  makeCountry('BEL', 'Belgium', 'Europe', 'Western Europe'),
  // Stage 4 (Medium)
  makeCountry('LUX', 'Luxembourg', 'Europe', 'Western Europe'),
  makeCountry('ARM', 'Armenia', 'Asia', 'Western Asia'),
  // Stage 5 (Hard)
  makeCountry('BWA', 'Botswana', 'Africa', 'Southern Africa'),
  makeCountry('MDA', 'Moldova', 'Europe', 'Eastern Europe'),
  // Stage 6 (Hard)
  makeCountry('BTN', 'Bhutan', 'Asia', 'Southern Asia'),
  makeCountry('MNG', 'Mongolia', 'Asia', 'Eastern Asia'),
  // Stage 7 (Expert)
  makeCountry('FJI', 'Fiji', 'Oceania', 'Melanesia'),
  makeCountry('VUT', 'Vanuatu', 'Oceania', 'Melanesia'),
  // Stage 9 uninhabited outpost
  makeCountry('BVT', 'Bouvet Island', 'Antarctic', 'South Atlantic'),
];

describe('GameEngineService country difficulty & progression', () => {
  const engine = new GameEngineService();

  it('escalates difficulty smoothly across a 10-round progressive match', () => {
    const config = {
      ...DEFAULT_ROOM_CONFIGURATION,
      challengeType: 'count' as const,
      challengeValue: 10,
      difficulty: 'progressive' as const,
    };

    expect(resolveTargetDifficultyTier(config, 1)).toBe('easy');
    expect(resolveTargetDifficultyTier(config, 3)).toBe('easy');
    expect(resolveTargetDifficultyTier(config, 4)).toBe('medium');
    expect(resolveTargetDifficultyTier(config, 6)).toBe('medium');
    expect(resolveTargetDifficultyTier(config, 7)).toBe('hard');
    expect(resolveTargetDifficultyTier(config, 8)).toBe('hard');
    expect(resolveTargetDifficultyTier(config, 9)).toBe('expert');
    expect(resolveTargetDifficultyTier(config, 10)).toBe('expert');

    const round1 = engine.createRound(config, SAMPLE_COUNTRIES, [], 1, 4);
    expect(round1?.round.difficultyTier).toBe('easy');
    expect(getCountryStage(round1!.round.targetCountryCode)).toBe(1);

    const round5 = engine.createRound(config, SAMPLE_COUNTRIES, [], 5, 4);
    expect(round5?.round.difficultyTier).toBe('medium');

    const round8 = engine.createRound(config, SAMPLE_COUNTRIES, [], 8, 4);
    expect(round8?.round.difficultyTier).toBe('hard');

    const round10 = engine.createRound(config, SAMPLE_COUNTRIES, [], 10, 4);
    expect(round10?.round.difficultyTier).toBe('expert');
  });

  it('respects fixed difficulty settings and falls back gracefully when a tier is exhausted', () => {
    const hardConfig = {
      ...DEFAULT_ROOM_CONFIGURATION,
      difficulty: 'hard' as const,
    };

    const used: string[] = [];
    for (let i = 1; i <= 4; i += 1) {
      const created = engine.createRound(
        hardConfig,
        SAMPLE_COUNTRIES,
        used,
        i,
        4,
      );
      expect(created?.round.difficultyTier).toBe('hard');
      used.push(created!.round.targetCountryCode);
    }

    // All 4 hard countries in SAMPLE_COUNTRIES are now used -> falls back to closest tier (medium)
    const fallback = engine.createRound(
      hardConfig,
      SAMPLE_COUNTRIES,
      used,
      5,
      4,
    );
    expect(fallback?.round.difficultyTier).toBe('medium');
  });

  it('excludes uninhabited sub-Antarctic outposts unless no other countries remain', () => {
    const expertConfig = {
      ...DEFAULT_ROOM_CONFIGURATION,
      difficulty: 'expert' as const,
    };

    const round1 = engine.createRound(
      expertConfig,
      SAMPLE_COUNTRIES,
      [],
      1,
      4,
    );
    expect(round1?.round.targetCountryCode).not.toBe('BVT');

    const nonOutpostCodes = SAMPLE_COUNTRIES.filter(
      (c) => c.cca3 !== 'BVT',
    ).map((c) => c.cca3);
    const onlyOutpostLeft = engine.createRound(
      expertConfig,
      SAMPLE_COUNTRIES,
      nonOutpostCodes,
      15,
      4,
    );
    expect(onlyOutpostLeft?.round.targetCountryCode).toBe('BVT');
  });

  it('selects multiple-choice distractors from the same subregion/region and similar difficulty tier', () => {
    const reverseEasyConfig = {
      ...DEFAULT_ROOM_CONFIGURATION,
      mode: 'reverse' as const,
      difficulty: 'easy' as const,
    };

    // Force target to FRA by marking other Easy countries as used
    const created = engine.createRound(
      reverseEasyConfig,
      SAMPLE_COUNTRIES,
      ['DEU', 'CHE', 'SWE'],
      1,
      4,
    );
    expect(created?.round.targetCountryCode).toBe('FRA');

    const choiceCodes = created!.round.choices.map((c) => c.countryCode);
    expect(choiceCodes).toContain('FRA');
    // Western Europe Easy/Medium neighbors (DEU, CHE, AUT, BEL, LUX) should be chosen over Fiji/Bhutan/Bouvet
    for (const code of choiceCodes) {
      if (code === 'FRA') continue;
      const tier = getCountryTier(code);
      expect(['easy', 'medium']).toContain(tier);
      expect(['DEU', 'CHE', 'AUT', 'BEL', 'LUX']).toContain(code);
    }
  });

  it('attaches lowercase flagCode on flag prompts and flag choices only in flag subMode', () => {
    const identifyFlag = engine.createRound(
      {
        ...DEFAULT_ROOM_CONFIGURATION,
        mode: 'identify',
        subMode: 'flag',
        difficulty: 'easy',
      },
      SAMPLE_COUNTRIES,
      [],
      1,
      4,
    );
    expect(identifyFlag?.round.prompt.type).toBe('flag');
    expect(identifyFlag?.round.prompt.flagCode).toBe(
      identifyFlag?.round.targetCountryCode.slice(0, 2).toLowerCase(),
    );

    const reverseFlag = engine.createRound(
      {
        ...DEFAULT_ROOM_CONFIGURATION,
        mode: 'reverse',
        subMode: 'flag',
        difficulty: 'easy',
      },
      SAMPLE_COUNTRIES,
      [],
      1,
      4,
    );
    expect(reverseFlag?.round.choices).toHaveLength(4);
    for (const choice of reverseFlag?.round.choices ?? []) {
      expect(choice.flagCode).toBe(choice.countryCode.slice(0, 2).toLowerCase());
    }

    const reverseName = engine.createRound(
      {
        ...DEFAULT_ROOM_CONFIGURATION,
        mode: 'reverse',
        subMode: 'name',
        difficulty: 'easy',
      },
      SAMPLE_COUNTRIES,
      [],
      1,
      4,
    );
    for (const choice of reverseName?.round.choices ?? []) {
      expect(choice.flagCode).toBeUndefined();
    }
  });
});

