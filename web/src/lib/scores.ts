import { type KeyValueStore, readJson, writeJson } from "./storage";

export const SCORE_PREFIX = "cascadeKeys.scores.";
export const DAILY_PREFIX = "cascadeKeys.daily.";
/** The leaderboard id for endless mode's best score. */
export const ENDLESS_ID = "endless";

/** A saved result for one song: the score, its stars, and the UTC date it was earned. */
export interface Score {
  score: number;
  stars: number;
  date: string;
}

/** A saved daily challenge result. It also names the song, which changes day to day. */
export interface DailyScore extends Score {
  songId: string;
}

export interface LeaderboardRow {
  kind: "song" | "daily" | "endless";
  songId: string;
  title: string;
  score: number;
  stars: number;
  date: string;
}

function isScore(value: unknown): value is Score {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.score === "number" && typeof v.stars === "number" && typeof v.date === "string";
}

function isDailyScore(value: unknown): value is DailyScore {
  return isScore(value) && typeof (value as Partial<DailyScore>).songId === "string";
}

/** The best saved result for a song, or null if it has never been finished. */
export function loadBest(store: KeyValueStore | null, songId: string): Score | null {
  const saved = readJson<unknown>(store, SCORE_PREFIX + songId);
  return isScore(saved) ? saved : null;
}

/** Keep the entry if its score beats the saved best, or if nothing is saved. Returns whether it was kept. */
export function saveBest(store: KeyValueStore | null, songId: string, entry: Score): boolean {
  const current = loadBest(store, songId);
  if (current && current.score >= entry.score) return false;
  writeJson(store, SCORE_PREFIX + songId, entry);
  return true;
}

/** The saved daily result for a date, or null if today's challenge has not been played. */
export function loadDaily(store: KeyValueStore | null, date: string): DailyScore | null {
  const saved = readJson<unknown>(store, DAILY_PREFIX + date);
  return isDailyScore(saved) ? saved : null;
}

/** Keep the first daily result of the day. Replays do not overwrite it. Returns whether it was kept. */
export function saveDaily(store: KeyValueStore | null, entry: DailyScore): boolean {
  if (loadDaily(store, entry.date)) return false;
  writeJson(store, DAILY_PREFIX + entry.date, entry);
  return true;
}

export interface StarSummary {
  /** Stars earned across every song's best result. */
  earned: number;
  /** The most stars there are to earn. Three for each song. */
  possible: number;
  /** Stars from today's daily challenge, or null when it has not been played. */
  daily: number | null;
}

/** The listing's star result: the stars earned across the song list, and today's daily stars. */
export function starSummary(store: KeyValueStore | null, songIds: readonly string[], today: string): StarSummary {
  const earned = songIds.reduce((sum, id) => sum + (loadBest(store, id)?.stars ?? 0), 0);
  return { earned, possible: songIds.length * 3, daily: loadDaily(store, today)?.stars ?? null };
}

/** Highest score first. Equal scores put the newer date first. */
export function sortByScore(rows: readonly LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
}

/** Every saved result as a leaderboard row, sorted by score. `titleFor` names a song id. */
export function readLeaderboard(store: KeyValueStore | null, titleFor: (songId: string) => string): LeaderboardRow[] {
  if (!store) return [];
  const rows: LeaderboardRow[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key) continue;

    if (key.startsWith(SCORE_PREFIX)) {
      const songId = key.slice(SCORE_PREFIX.length);
      const saved = loadBest(store, songId);
      if (!saved) continue;
      const endless = songId === ENDLESS_ID;
      rows.push({
        kind: endless ? "endless" : "song",
        songId,
        title: endless ? "Arcade" : titleFor(songId),
        ...saved,
      });
    } else if (key.startsWith(DAILY_PREFIX)) {
      const saved = readJson<unknown>(store, key);
      if (!isDailyScore(saved)) continue;
      rows.push({
        kind: "daily",
        songId: saved.songId,
        title: titleFor(saved.songId),
        score: saved.score,
        stars: saved.stars,
        date: saved.date,
      });
    }
  }
  return sortByScore(rows);
}
