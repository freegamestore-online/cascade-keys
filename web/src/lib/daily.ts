const DAY_MS = 86_400_000;

/** The daily song's index in the song list for a moment in time: one song per UTC day, cycling through the list. */
export function dailyIndex(timestampMs: number, songCount: number): number {
  return Math.floor(timestampMs / DAY_MS) % songCount;
}

/** The UTC calendar date for a moment, such as "2026-10-16". It keys each day's saved daily result. */
export function dayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}
