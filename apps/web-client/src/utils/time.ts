/**
 * Formats a duration into a human-readable string, auto-scaling the unit.
 *
 * Output format depends on the magnitude:
 *  - < 60s        →  "0:SS"         e.g. "0:42"
 *  - < 1h         →  "MM:SS"        e.g. "12:05"
 *  - < 1d         →  "H:MM:SS"      e.g. "2:04:33"
 *  - ≥ 1d         →  "Dd H:MM:SS"   e.g. "3d 1:22:45"
 *
 * @param time The time value to format.
 * @param unit The unit of `time` — `'ms'` (milliseconds) or `'s'` (seconds). Defaults to `'ms'`.
 */
export const formatDuration = (time: number, unit: 'ms' | 's' = 'ms'): string => {
  const totalSeconds = Math.max(0, unit === 'ms' ? Math.floor(time / 1000) : Math.floor(time));

  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const ss = s.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');

  if (d > 0) {
    return `${d}d ${h}:${mm}:${ss}`;
  }
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
};
