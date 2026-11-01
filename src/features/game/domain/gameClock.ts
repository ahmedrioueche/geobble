export type GameClock = () => number;

export const systemGameClock: GameClock = () => Date.now();

export const getRemainingSeconds = (
  deadlineAt: number,
  now: number,
): number => Math.max(0, Math.ceil((deadlineAt - now) / 1000));
