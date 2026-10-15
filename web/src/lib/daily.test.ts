import { describe, expect, it } from "vitest";
import { dailyIndex, dayKey } from "./daily";

const DAY_MS = 86_400_000;

describe("dailyIndex", () => {
  it("returns the expected index for a known date", () => {
    // 2026-10-16 is day 20742 since the epoch, and 20742 % 27 = 6.
    expect(dailyIndex(Date.UTC(2026, 9, 16), 27)).toBe(6);
  });

  it("is the same for every moment of one UTC day", () => {
    expect(dailyIndex(DAY_MS + 1, 27)).toBe(dailyIndex(2 * DAY_MS - 1, 27));
  });

  it("moves to the next song each day and wraps around the list", () => {
    expect(dailyIndex(0, 27)).toBe(0);
    expect(dailyIndex(5 * DAY_MS + 123, 27)).toBe(5);
    expect(dailyIndex(30 * DAY_MS, 27)).toBe(3);
  });
});

describe("dayKey", () => {
  it("gives the UTC calendar date", () => {
    expect(dayKey(Date.UTC(2026, 9, 16, 23, 59))).toBe("2026-10-16");
  });
});
