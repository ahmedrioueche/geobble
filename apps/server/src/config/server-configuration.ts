import { Logger } from '@nestjs/common';

export interface ServerConfiguration {
  port: number;
  mongoUri: string;
  clientOrigins: string[];
  roomMaxPlayers: number;
  roomIdLength: number;
  socketEventsPerMinute: number;
  maxChallengeValue: number;
  reconnectGraceMs: number;
  roomExpiryHours: number;
  roundAdvanceDelayMs: number;
  pointsPerCorrectAnswer: number;
  streakBonusPoints: number;
  choicesPerRound: number;
  countryDataCacheMs: number;
  restCountriesApiUrl: string;
  restCountriesApiKey: string | null;
}

const logger = new Logger('Configuration');

const readInteger = (
  env: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
): number => {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${key} must be an integer greater than or equal to ${minimum}`);
  }
  return parsed;
};

export const getConfiguredClientOrigins = (): string[] =>
  (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const validateEnvironment = (
  env: Record<string, unknown>,
): Record<string, unknown> => {
  const mongoUri = env.MONGODB_URI;
  if (typeof mongoUri !== 'string' || mongoUri.trim().length === 0) {
    throw new Error('MONGODB_URI is required');
  }

  if (
    env.CLIENT_ORIGINS !== undefined &&
    typeof env.CLIENT_ORIGINS !== 'string'
  ) {
    throw new Error('CLIENT_ORIGINS must be a comma-separated string');
  }

  const clientOrigins =
    typeof env.CLIENT_ORIGINS === 'string'
      ? env.CLIENT_ORIGINS
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : getConfiguredClientOrigins();

  if (clientOrigins.length === 0) {
    throw new Error('CLIENT_ORIGINS must contain at least one origin');
  }

  const port = readInteger(env, 'PORT', 3000, 1);
  const roomMaxPlayers = readInteger(env, 'ROOM_MAX_PLAYERS', 8, 2);
  const roomIdLength = readInteger(env, 'ROOM_ID_LENGTH', 4, 4);
  if (roomIdLength > 12) {
    throw new Error('ROOM_ID_LENGTH must be less than or equal to 12');
  }
  const socketEventsPerMinute = readInteger(
    env,
    'SOCKET_EVENTS_PER_MINUTE',
    120,
    10,
  );
  const maxChallengeValue = readInteger(
    env,
    'MAX_CHALLENGE_VALUE',
    500,
    1,
  );
  const reconnectGraceMs = readInteger(
    env,
    'ROOM_RECONNECT_GRACE_MS',
    60_000,
    1_000,
  );
  const roomExpiryHours = readInteger(env, 'ROOM_EXPIRY_HOURS', 24, 1);
  const roundAdvanceDelayMs = readInteger(
    env,
    'ROUND_ADVANCE_DELAY_MS',
    1_500,
    0,
  );
  const pointsPerCorrectAnswer = readInteger(
    env,
    'POINTS_PER_CORRECT_ANSWER',
    10,
    1,
  );
  const streakBonusPoints = readInteger(env, 'STREAK_BONUS_POINTS', 5, 0);
  const choicesPerRound = readInteger(env, 'CHOICES_PER_ROUND', 4, 2);
  const countryDataCacheMs = readInteger(
    env,
    'COUNTRY_DATA_CACHE_MS',
    3_600_000,
    60_000,
  );

  const apiUrl =
    env.REST_COUNTRIES_API_URL ??
    'https://api.restcountries.com/countries/v5?response_fields=names.common,codes.alpha_2,codes.alpha_3,codes.numeric,capitals,region,subregion,flag.emoji';
  if (typeof apiUrl !== 'string' || !URL.canParse(apiUrl)) {
    throw new Error('REST_COUNTRIES_API_URL must be a valid URL');
  }

  const apiKey = env.REST_COUNTRIES_API_KEY;
  if (apiKey !== undefined && typeof apiKey !== 'string') {
    throw new Error('REST_COUNTRIES_API_KEY must be a string');
  }
  if (
    new URL(apiUrl).hostname === 'api.restcountries.com' &&
    (typeof apiKey !== 'string' || apiKey.trim().length === 0)
  ) {
    throw new Error('REST_COUNTRIES_API_KEY is required for REST Countries v5');
  }

  const config: ServerConfiguration = {
    port,
    mongoUri: mongoUri.trim(),
    clientOrigins,
    roomMaxPlayers,
    roomIdLength,
    socketEventsPerMinute,
    maxChallengeValue,
    reconnectGraceMs,
    roomExpiryHours,
    roundAdvanceDelayMs,
    pointsPerCorrectAnswer,
    streakBonusPoints,
    choicesPerRound,
    countryDataCacheMs,
    restCountriesApiUrl: apiUrl,
    restCountriesApiKey:
      typeof apiKey === 'string' && apiKey.trim().length > 0
        ? apiKey.trim()
        : null,
  };

  logger.log('Server configuration validated');
  return { ...env, ...config };
};
