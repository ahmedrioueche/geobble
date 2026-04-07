/**
 * Formats a duration in milliseconds or seconds into a MM:SS string.
 * @param time The time to format.
 * @param unit The unit of the 'time' parameter ('ms' or 's'). Defaults to 'ms'.
 */
export const formatDuration = (time: number, unit: 'ms' | 's' = 'ms') => {
  const totalSeconds = unit === 'ms' ? Math.floor(time / 1000) : time;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
