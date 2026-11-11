import type { RoomConfiguration } from "../contracts/multiplayerRoomProtocol";

export interface RoomSettingEntry {
  key: string;
  label: string;
  value: string;
}

export interface RoomSettingDiff {
  key: string;
  label: string;
  from: string;
  to: string;
}

export const normalizeRoomConfig = (
  config: RoomConfiguration,
): Required<RoomConfiguration> => ({
  mode: config.mode,
  pinDirection: config.mode === "pin" ? config.pinDirection : "locate",
  subMode: config.subMode,
  challengeType: config.challengeType,
  challengeValue: config.challengeType === "world" ? 0 : config.challengeValue,
  endless: config.endless !== false,
  difficulty: config.difficulty ?? "progressive",
  roundTimeLimitSeconds: config.roundTimeLimitSeconds ?? 20,
  speedScoring: config.speedScoring !== false,
  wrongAnswerPenalty: config.wrongAnswerPenalty ?? 0,
});

const formatChallenge = (config: Required<RoomConfiguration>): string => {
  if (config.challengeType === "world") {
    return config.endless ? "Whole world (endless)" : "Whole world";
  }
  if (config.challengeType === "count") {
    return config.endless
      ? `Checkpoint every ${config.challengeValue} rounds`
      : `${config.challengeValue} rounds`;
  }
  return config.endless
    ? `Checkpoint every ${config.challengeValue}s`
    : `${config.challengeValue} seconds`;
};

const formatDifficulty = (
  difficulty: Required<RoomConfiguration>["difficulty"],
): string =>
  difficulty === "progressive"
    ? "Progressive"
    : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

export const getRoomSettingsEntries = (
  rawConfig: RoomConfiguration,
): RoomSettingEntry[] => {
  const config = normalizeRoomConfig(rawConfig);
  return [
    {
      key: "mode",
      label: "Mode",
      value:
        config.mode === "pin"
          ? `Pin · ${config.pinDirection === "locate" ? "Locate country" : "Identify pin"}`
          : config.mode === "reverse"
            ? "Reverse"
            : "Identify",
    },
    {
      key: "prompt",
      label: "Prompt",
      value:
        config.subMode === "flag"
          ? "Flag"
          : config.subMode === "capital"
            ? "Capital"
            : "Country name",
    },
    {
      key: "difficulty",
      label: "Difficulty",
      value: formatDifficulty(config.difficulty),
    },
    {
      key: "challenge",
      label: "Challenge",
      value: formatChallenge(config),
    },
    {
      key: "roundTimer",
      label: "Round timer",
      value:
        config.roundTimeLimitSeconds === 0
          ? "Off"
          : `${config.roundTimeLimitSeconds}s`,
    },
    {
      key: "scoring",
      label: "Scoring",
      value: [
        config.speedScoring ? "Speed bonus" : "Flat",
        config.wrongAnswerPenalty > 0
          ? `-${config.wrongAnswerPenalty} on wrong`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
  ];
};

export const getRoomSettingsDiff = (
  currentRaw: RoomConfiguration,
  proposedRaw: RoomConfiguration,
): RoomSettingDiff[] => {
  const currentEntries = getRoomSettingsEntries(currentRaw);
  const proposedEntries = getRoomSettingsEntries(proposedRaw);
  const diffs: RoomSettingDiff[] = [];

  for (let index = 0; index < currentEntries.length; index += 1) {
    const current = currentEntries[index];
    const next = proposedEntries[index];
    if (!current || !next || current.value === next.value) continue;
    diffs.push({
      key: current.key,
      label: current.label,
      from: current.value,
      to: next.value,
    });
  }
  return diffs;
};

