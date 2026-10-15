import { describe, expect, it } from "vitest";
import { memoryStore } from "../test/memoryStore";
import {
  beatTimes,
  calibrationOffset,
  clampOffset,
  loadLatencyOffset,
  MAX_OFFSET_MS,
  resetLatencyOffset,
  saveLatencyOffset,
} from "./latency";

describe("latency offset storage", () => {
  it("defaults to 0 when nothing is saved", () => {
    expect(loadLatencyOffset(memoryStore())).toBe(0);
  });

  it("saves and loads a number of ms", () => {
    const store = memoryStore();
    saveLatencyOffset(store, 42);
    expect(store.getItem("cascadeKeys.latencyOffset")).toBe("42");
    expect(loadLatencyOffset(store)).toBe(42);
  });

  it("goes back to 0 on reset", () => {
    const store = memoryStore();
    saveLatencyOffset(store, -30);
    resetLatencyOffset(store);
    expect(loadLatencyOffset(store)).toBe(0);
  });

  it("reads a corrupt stored value as 0", () => {
    const store = memoryStore();
    store.setItem("cascadeKeys.latencyOffset", "{not json");
    expect(loadLatencyOffset(store)).toBe(0);
  });

  it("works without a store", () => {
    expect(loadLatencyOffset(null)).toBe(0);
    expect(() => saveLatencyOffset(null, 10)).not.toThrow();
  });
});

describe("clampOffset", () => {
  it("rounds to whole ms and clamps to the allowed range", () => {
    expect(clampOffset(12.4)).toBe(12);
    expect(clampOffset(9999)).toBe(MAX_OFFSET_MS);
    expect(clampOffset(-9999)).toBe(-MAX_OFFSET_MS);
    expect(clampOffset(Number.NaN)).toBe(0);
  });
});

describe("calibrationOffset", () => {
  const beats = beatTimes(0, 3);

  it("is the mean gap between taps and their beats, positive when late", () => {
    expect(calibrationOffset([30, 630, 1230], beats)).toBe(30);
  });

  it("averages early and late taps", () => {
    expect(calibrationOffset([40, 600 - 20, 1200 + 10], beats)).toBe(10);
  });

  it("ignores a tap more than half a beat from every beat", () => {
    expect(calibrationOffset([30, 630, -1000], beats)).toBe(30);
  });

  it("returns null when no tap counts", () => {
    expect(calibrationOffset([], beats)).toBeNull();
    expect(calibrationOffset([-1000], beats)).toBeNull();
  });
});

describe("beatTimes", () => {
  it("spaces the beats evenly from the start", () => {
    expect(beatTimes(1000, 3)).toEqual([1000, 1600, 2200]);
  });
});
