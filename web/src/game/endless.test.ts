import { describe, expect, it } from "vitest";
import type { NoteType } from "../types";
import {
  ENDLESS_MIN_GAP_MS,
  ENDLESS_START_GAP_MS,
  EndlessGenerator,
  endlessGapMs,
} from "./endless";

describe("endlessGapMs", () => {
  it("starts at the start gap and closes to the minimum", () => {
    expect(endlessGapMs(0)).toBe(ENDLESS_START_GAP_MS);
    expect(endlessGapMs(20_000)).toBeLessThan(endlessGapMs(5_000));
    expect(endlessGapMs(600_000)).toBe(ENDLESS_MIN_GAP_MS);
  });
});

describe("EndlessGenerator", () => {
  it("makes notes in time order, in valid lanes and types, with a closing gap", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const generator = new EndlessGenerator(random);
    const notes = Array.from({ length: 400 }, () => generator.next());

    for (let i = 1; i < notes.length; i++) {
      expect(notes[i]!.time).toBeGreaterThan(notes[i - 1]!.time);
    }
    for (const note of notes) {
      expect([0, 1, 2, 3]).toContain(note.lane);
      expect(["tap", "hold", "double"] satisfies NoteType[]).toContain(note.type);
      expect(note.duration).toBeGreaterThan(0);
    }
    const early = notes[1]!.time - notes[0]!.time;
    const late = notes.at(-1)!.time - notes.at(-2)!.time;
    expect(late).toBeLessThan(early);
  });

  it("uses the random source for lanes and types", () => {
    const notes = [0.5, 0.5].map(() => new EndlessGenerator(() => 0.5).next());
    expect(notes[0]).toMatchObject({ lane: 2, type: "tap" });
  });
});
