import { describe, expect, it } from "vitest";
import { memoryStore } from "../test/memoryStore";
import {
  DAILY_PREFIX,
  ENDLESS_ID,
  loadBest,
  loadDaily,
  type LeaderboardRow,
  readLeaderboard,
  saveBest,
  saveDaily,
  SCORE_PREFIX,
  sortByScore,
  starSummary,
} from "./scores";

const titles: Record<string, string> = { "ode-to-joy": "Ode to Joy", twinkle: "Twinkle" };
const titleFor = (id: string) => titles[id] ?? id;

describe("best scores", () => {
  it("saves a first result and keeps only a higher score after that", () => {
    const store = memoryStore();
    expect(saveBest(store, "twinkle", { score: 500, stars: 2, date: "2026-10-01" })).toBe(true);
    expect(saveBest(store, "twinkle", { score: 300, stars: 3, date: "2026-10-02" })).toBe(false);
    expect(saveBest(store, "twinkle", { score: 900, stars: 3, date: "2026-10-03" })).toBe(true);

    expect(loadBest(store, "twinkle")).toEqual({ score: 900, stars: 3, date: "2026-10-03" });
    expect(store.getItem(`${SCORE_PREFIX}twinkle`)).not.toBeNull();
  });

  it("reads a song that was never finished as null", () => {
    expect(loadBest(memoryStore(), "twinkle")).toBeNull();
  });

  it("reads a corrupt entry as null", () => {
    const store = memoryStore();
    store.setItem(`${SCORE_PREFIX}twinkle`, JSON.stringify({ score: "lots" }));
    expect(loadBest(store, "twinkle")).toBeNull();
  });
});

describe("daily results", () => {
  it("keeps the first result of the day and not replays", () => {
    const store = memoryStore();
    const first = { songId: "twinkle", score: 400, stars: 1, date: "2026-10-16" };
    expect(saveDaily(store, first)).toBe(true);
    expect(saveDaily(store, { ...first, score: 9000, stars: 3 })).toBe(false);
    expect(loadDaily(store, "2026-10-16")).toEqual(first);
    expect(store.getItem(`${DAILY_PREFIX}2026-10-16`)).not.toBeNull();
  });
});

describe("sortByScore", () => {
  const row = (score: number, date: string): LeaderboardRow => ({
    kind: "song",
    songId: "twinkle",
    title: "Twinkle",
    score,
    stars: 1,
    date,
  });

  it("orders by score, highest first", () => {
    const sorted = sortByScore([row(100, "2026-10-01"), row(900, "2026-10-01"), row(500, "2026-10-01")]);
    expect(sorted.map((r) => r.score)).toEqual([900, 500, 100]);
  });

  it("puts the newer date first when scores tie", () => {
    const sorted = sortByScore([row(500, "2026-10-01"), row(500, "2026-10-09")]);
    expect(sorted.map((r) => r.date)).toEqual(["2026-10-09", "2026-10-01"]);
  });
});

describe("readLeaderboard", () => {
  it("collects song, daily and endless results and sorts them by score", () => {
    const store = memoryStore();
    saveBest(store, "ode-to-joy", { score: 700, stars: 2, date: "2026-10-10" });
    saveBest(store, "twinkle", { score: 1200, stars: 3, date: "2026-10-11" });
    saveDaily(store, { songId: "ode-to-joy", score: 1000, stars: 3, date: "2026-10-12" });
    saveBest(store, ENDLESS_ID, { score: 800, stars: 0, date: "2026-10-13" });

    const rows = readLeaderboard(store, titleFor);

    expect(rows.map((r) => r.score)).toEqual([1200, 1000, 800, 700]);
    expect(rows.map((r) => r.kind)).toEqual(["song", "daily", "endless", "song"]);
    expect(rows[1]).toMatchObject({ title: "Ode to Joy", date: "2026-10-12", stars: 3 });
    expect(rows[2]?.title).toBe("Arcade");
  });

  it("is empty with no store or nothing saved", () => {
    expect(readLeaderboard(null, titleFor)).toEqual([]);
    expect(readLeaderboard(memoryStore(), titleFor)).toEqual([]);
  });
});

describe("starSummary", () => {
  it("adds up the best stars across songs and reports today's daily stars", () => {
    const store = memoryStore();
    saveBest(store, "ode-to-joy", { score: 700, stars: 2, date: "2026-10-10" });
    saveBest(store, "twinkle", { score: 1200, stars: 3, date: "2026-10-11" });
    saveDaily(store, { songId: "twinkle", score: 1200, stars: 3, date: "2026-10-16" });

    expect(starSummary(store, ["ode-to-joy", "twinkle", "fur-elise"], "2026-10-16")).toEqual({
      earned: 5,
      possible: 9,
      daily: 3,
    });
    expect(starSummary(store, ["twinkle"], "2026-10-17").daily).toBeNull();
  });

  it("is zero with no store", () => {
    expect(starSummary(null, ["twinkle"], "2026-10-16")).toEqual({ earned: 0, possible: 3, daily: null });
  });
});
