import type { CountryData } from "../../../data/country-data";
import type { GameSessionState, SubMode } from "./gameSession";
import { getNextSeededRandom } from "./seededRandom";
import {
  generateChoiceCountries,
  getTargetPool,
  isCountChallengeComplete,
  pickRandom,
} from "./gameRules";
import { getMissionStartSettings } from "./missionProgression";
import { buildMissionResult } from "./missionResult";

export type MissionTransition =
  | { type: "ignored"; session: GameSessionState }
  | {
      type: "finished";
      reason: "world-complete" | "target-exhausted";
      session: GameSessionState;
    }
  | {
      type: "advanced";
      session: GameSessionState;
      target: CountryData;
    };

const getChoiceValue = (country: CountryData, subMode: SubMode): string => {
  if (subMode === "flag") return country.cca2 || "??";
  if (subMode === "capital") {
    return country.capital && country.capital.length > 0
      ? country.capital[0]
      : "No Capital";
  }
  return country.name || "Unknown";
};

const createRandomStream = (initialState: number) => {
  let state = initialState;
  return {
    random: () => {
      const next = getNextSeededRandom(state);
      state = next.state;
      return next.value;
    },
    getState: () => state,
  };
};

const createChoiceOptions = (
  target: CountryData,
  countries: CountryData[],
  subMode: SubMode,
  random: () => number,
) => {
  const options = generateChoiceCountries(target, countries, random)
    .map((country) => ({
      code: country.cca3,
      value: getChoiceValue(country, subMode),
    }))
    .sort((first, second) => first.value.localeCompare(second.value));

  return {
    choices: options.map((option) => option.value),
    choiceCodes: options.map((option) => option.code),
  };
};

export const advanceMission = (
  session: GameSessionState,
  countries: CountryData[],
  unlockedStage: number,
): MissionTransition => {
  if (countries.length === 0 || session.gameStatus !== "playing") {
    return { type: "ignored", session };
  }

  if (
    isCountChallengeComplete(
      session.challengeType,
      session.challengeValue,
      session.totalAttempts,
    )
  ) {
    return { type: "ignored", session };
  }

  if (
    session.challengeType === "world" &&
    session.totalQuestions >= countries.length
  ) {
    return { type: "finished", reason: "world-complete", session };
  }

  const targetPool = getTargetPool({
    countries,
    challengeType: session.challengeType,
    challengeValue: session.challengeValue,
    difficultyStage: session.difficultyStage,
    unlockedStage,
    playedCountryCodes: session.playedCountryCodes,
    sessionPlayedCodes: session.sessionPlayedCodes,
  });
  const randomStream = createRandomStream(session.randomState);
  const target = pickRandom(targetPool, randomStream.random);
  if (!target) {
    return { type: "finished", reason: "target-exhausted", session };
  }

  const choices =
    session.mode === "reverse" ||
    (session.mode === "pin" && session.pinDirection === "identify")
      ? createChoiceOptions(
          target,
          countries,
          session.subMode,
          randomStream.random,
        )
      : null;
  const nextQuestionNumber = session.totalQuestions + 1;
  const nextSession: GameSessionState = {
    ...session,
    randomState: randomStream.getState(),
    pendingAdvanceAt: null,
    revealed: false,
    pinLocation: null,
    currentCountryCode: target.cca3,
    playedCountryCodes: [...session.playedCountryCodes, target.cca3],
    sessionPlayedCodes: Array.from(
      new Set([...session.sessionPlayedCodes, target.cca3]),
    ),
    totalQuestions: nextQuestionNumber,
    missionId: `${session.id ?? "session"}:${nextQuestionNumber}`,
    ...(choices
      ? {
          choices: choices.choices,
          choiceCodes: choices.choiceCodes,
        }
      : {}),
  };

  return { type: "advanced", session: nextSession, target };
};

export const startMission = (
  session: GameSessionState,
  countries: CountryData[],
  unlockedStage: number,
): MissionTransition => {
  const settings = getMissionStartSettings({
    challengeType: session.challengeType,
    baseChallengeValue: session.baseChallengeValue,
    challengeValue: session.challengeValue,
    difficultyStage: session.difficultyStage,
  });
  const startedSession: GameSessionState = {
    ...session,
    totalLevels: settings.totalLevels,
    ...(session.challengeType === "count" &&
    settings.challengeValue !== session.challengeValue
      ? {
          challengeValue: settings.challengeValue,
          baseChallengeValue: settings.challengeValue,
        }
      : {}),
    score: 0,
    streak: 0,
    gameStatus: "playing",
  };

  return advanceMission(startedSession, countries, unlockedStage);
};

export const finishMission = (
  session: GameSessionState,
  countriesCount: number,
  now: number,
) => ({
  session: {
    ...session,
    gameStatus: "finished" as const,
    timerDeadlineAt: null,
    pendingAdvanceAt: null,
  },
  result: buildMissionResult({
    score: session.score,
    maxStreak: session.maxStreak,
    totalAttempts: session.totalAttempts,
    correctAttempts: session.correctAttempts,
    challengeType: session.challengeType,
    challengeValue: session.challengeValue,
    difficultyStage: session.difficultyStage,
    totalQuestions: session.totalQuestions,
    countriesCount,
    startTime: session.startTime,
    now,
    totalLevels: session.totalLevels,
  }),
});

export const getChoiceOptions = (
  choiceCodes: string[],
  countries: CountryData[],
  subMode: SubMode,
) => {
  const options = choiceCodes
    .map((code) => {
      const country = countries.find((item) => item.cca3 === code);
      return {
        code,
        value: country ? getChoiceValue(country, subMode) : "Unknown",
      };
    })
    .sort((first, second) => first.value.localeCompare(second.value));

  return {
    choices: options.map((option) => option.value),
    choiceCodes: options.map((option) => option.code),
  };
};
