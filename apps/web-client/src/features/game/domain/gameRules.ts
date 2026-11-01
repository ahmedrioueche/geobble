import type { CountryData } from "../../../data/country-data";
import {
  getDifficulty,
  getTierRanges,
  SORTED_POOL,
} from "../../../data/difficulty-ranking";
import { nameMapping } from "../../../data/name-mapping";
import { normalizeCountryName } from "../../../utils/name-normalizer";
import type { ChallengeType, SubMode } from "./gameSession";

type Answer =
  | { type: "map"; country: CountryData | null }
  | { type: "choice"; value: string };

interface TargetPoolOptions {
  countries: CountryData[];
  challengeType: ChallengeType;
  challengeValue: number;
  difficultyStage: number;
  unlockedStage: number;
  playedCountryCodes: string[];
  sessionPlayedCodes: string[];
}

export interface AnswerTransition {
  feedback: "correct" | "wrong";
  score: number;
  streak: number;
  streakLost: number | null;
  revealed: boolean;
}

export type RoundAction =
  | {
      type: "answer";
      isCorrect: boolean;
      ignoreIncorrectWhenRevealed?: boolean;
    }
  | { type: "reveal"; loseStreak: boolean }
  | { type: "skip" };

export interface RoundActionTransition {
  kind: "outcome" | "advance" | "ignore";
  attemptIsCorrect: boolean | null;
  feedback: "correct" | "wrong" | null;
  score: number;
  streak: number;
  streakLost: number | null;
  revealed: boolean;
  advanceDelayMs: number | null;
}

interface RoundActionState {
  score: number;
  streak: number;
  revealed: boolean;
}

export const getRoundActionTransition = (
  action: RoundAction,
  state: RoundActionState,
): RoundActionTransition => {
  if (action.type === "answer" && state.revealed) {
    if (action.isCorrect) {
      return {
        kind: "advance",
        attemptIsCorrect: null,
        feedback: null,
        score: state.score,
        streak: state.streak,
        streakLost: null,
        revealed: state.revealed,
        advanceDelayMs: 0,
      };
    }
    if (action.ignoreIncorrectWhenRevealed) {
      return {
        kind: "ignore",
        attemptIsCorrect: null,
        feedback: null,
        score: state.score,
        streak: state.streak,
        streakLost: null,
        revealed: state.revealed,
        advanceDelayMs: null,
      };
    }
  }

  if (action.type === "answer") {
    const answer = getAnswerTransition(action.isCorrect, state);
    return {
      kind: "outcome",
      attemptIsCorrect: action.isCorrect,
      ...answer,
      advanceDelayMs: action.isCorrect ? 1200 : 2000,
    };
  }

  if (action.type === "reveal") {
    return {
      kind: "outcome",
      attemptIsCorrect: false,
      feedback: null,
      score: state.score,
      streak: action.loseStreak ? 0 : state.streak,
      streakLost: action.loseStreak && state.streak > 0 ? state.streak : null,
      revealed: true,
      advanceDelayMs: 2500,
    };
  }

  return {
    kind: "outcome",
    attemptIsCorrect: false,
    feedback: null,
    score: state.score,
    streak: 0,
    streakLost: state.streak > 0 ? state.streak : null,
    revealed: true,
    advanceDelayMs: 1500,
  };
};

export const isCountChallengeComplete = (
  challengeType: ChallengeType,
  challengeValue: number,
  totalAttempts: number,
): boolean =>
  challengeType === "count" && totalAttempts >= challengeValue;

export const isChallengeComplete = (
  challengeType: ChallengeType,
  challengeValue: number,
  totalAttempts: number,
  timeRemaining: number,
): boolean =>
  isCountChallengeComplete(challengeType, challengeValue, totalAttempts) ||
  (challengeType === "timer" && timeRemaining <= 0);

export const shouldAdvanceRound = (
  challengeType: ChallengeType,
  challengeValue: number,
  totalAttempts: number,
): boolean =>
  !isCountChallengeComplete(challengeType, challengeValue, totalAttempts);

export const getAnswerTransition = (
  isCorrect: boolean,
  state: Pick<AnswerTransition, "score" | "streak">,
): AnswerTransition => ({
  feedback: isCorrect ? "correct" : "wrong",
  score: isCorrect ? state.score + 10 * (state.streak + 1) : state.score,
  streak: isCorrect ? state.streak + 1 : 0,
  streakLost: !isCorrect && state.streak > 0 ? state.streak : null,
  revealed: !isCorrect,
});

export const resolveMapCountry = (
  name: string,
  code: string,
  countries: CountryData[],
): CountryData | null => {
  const countryByCode =
    countries.find((country) => country.cca3 === code) ||
    countries.find((country) => country.ccn3 === code);
  if (countryByCode) return countryByCode;

  const normalizedName = normalizeCountryName(nameMapping[name] || name);
  return (
    countries.find(
      (country) => normalizeCountryName(country.name) === normalizedName,
    ) || null
  );
};

export const getTargetPool = ({
  countries,
  challengeType,
  challengeValue,
  difficultyStage,
  unlockedStage,
  playedCountryCodes,
  sessionPlayedCodes,
}: TargetPoolOptions): CountryData[] => {
  if (challengeType === "world") {
    const playedCodes = new Set(sessionPlayedCodes);
    return countries.filter(
      (country) =>
        getDifficulty(country.cca3) <= unlockedStage &&
        !playedCodes.has(country.cca3),
    );
  }

  const sliceSize = challengeType === "count" ? challengeValue : 30;
  const ranges = getTierRanges(sliceSize);
  if (ranges.length === 0) return [];

  const rangeIndex = Math.max(
    0,
    Math.min(difficultyStage - 1, ranges.length - 1),
  );
  const range = ranges[rangeIndex];
  if (!range) return [];

  const levelCodes = new Set(SORTED_POOL.slice(range.start, range.end));
  const playedCodes = new Set(playedCountryCodes);
  return countries.filter(
    (country) =>
      levelCodes.has(country.cca3) && !playedCodes.has(country.cca3),
  );
};

const shuffled = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(
      index,
      Math.max(0, Math.floor(random() * (index + 1))),
    );
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const pickRandom = <T>(
  items: T[],
  random: () => number = Math.random,
): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.min(
    items.length - 1,
    Math.max(0, Math.floor(random() * items.length)),
  );
  return items[index];
};

export const generateChoiceCountries = (
  target: CountryData,
  countries: CountryData[],
  random: () => number = Math.random,
): CountryData[] => {
  const distractors: CountryData[] = [];
  const selectedCodes = new Set([target.cca3]);

  const addFromPool = (pool: CountryData[]) => {
    for (const country of shuffled(pool, random)) {
      if (distractors.length === 3) break;
      if (!selectedCodes.has(country.cca3)) {
        distractors.push(country);
        selectedCodes.add(country.cca3);
      }
    }
  };

  addFromPool(
    countries.filter(
      (country) =>
        country.subregion === target.subregion &&
        country.cca3 !== target.cca3,
    ),
  );

  if (distractors.length < 3) {
    addFromPool(
      countries.filter(
        (country) =>
          country.region === target.region &&
          country.cca3 !== target.cca3,
      ),
    );
  }

  if (distractors.length < 3) {
    addFromPool(countries.filter((country) => country.cca3 !== target.cca3));
  }

  return [target, ...distractors];
};

export const isCorrectAnswer = (
  answer: Answer,
  target: CountryData,
  subMode: SubMode,
): boolean => {
  if (answer.type === "map") {
    return answer.country?.cca3 === target.cca3;
  }

  const value = answer.value.toLowerCase();
  if (subMode === "flag") return value === target.cca2.toLowerCase();
  if (subMode === "capital") {
    return value === target.capital?.[0]?.toLowerCase();
  }

  return normalizeCountryName(answer.value) === normalizeCountryName(target.name);
};
