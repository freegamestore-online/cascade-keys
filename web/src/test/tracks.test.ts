import { describe, expect, it } from "vitest";
import { tracks } from "../data/tracks";

const TRADITIONAL = "Traditional";
const LANES = [0, 1, 2, 3];
const NOTE_TYPES = ["tap", "hold", "double"];

describe("track list", () => {
  it("has at least 25 tracks", () => {
    expect(tracks.length).toBeGreaterThanOrEqual(25);
  });

  it("gives every track a unique id", () => {
    const ids = tracks.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(tracks.map((track) => [track.id, track] as const))("%s has the required fields", (_id, track) => {
    expect(track.id).toEqual(expect.any(String));
    expect(track.title).toEqual(expect.any(String));
    expect(track.composer).toEqual(expect.any(String));
    expect(track.deathYear === null || typeof track.deathYear === "number").toBe(true);
    expect(track.source).toEqual(expect.any(String));
    expect(track.source.length).toBeGreaterThan(0);
    expect(Array.isArray(track.notes)).toBe(true);
  });

  it.each(tracks.map((track) => [track.id, track] as const))("%s is public domain", (_id, track) => {
    if (track.composer === TRADITIONAL) {
      expect(track.deathYear).toBeNull();
    } else {
      expect(track.deathYear).not.toBeNull();
      expect(track.deathYear!).toBeLessThan(1925);
    }
  });

  it.each(tracks.map((track) => [track.id, track] as const))("%s has a playable note sequence", (_id, track) => {
    expect(track.notes.length).toBeGreaterThanOrEqual(10);
    for (const note of track.notes) {
      expect(LANES).toContain(note.lane);
      expect(note.time).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(NOTE_TYPES).toContain(note.type);
    }
  });

  describe("summary", () => {
    it("lists every track with its composer and death year", () => {
      const lines = tracks.map((track) => {
        const seconds = Math.round(Math.max(...track.notes.map((note) => note.time + note.duration)) / 1000);
        const year = track.deathYear ?? "n/a";
        return `${track.title} | ${track.composer} (d. ${year}) | ${track.notes.length} notes, ~${seconds}s`;
      });
      console.info(`Cascade Keys: ${tracks.length} public-domain tracks\n${lines.join("\n")}`);
      expect(lines).toHaveLength(tracks.length);
    });
  });
});
