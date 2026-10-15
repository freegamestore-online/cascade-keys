import { describe, expect, it } from "vitest";
import type { Lane, Note, NoteType } from "../types";
import {
  GameEngine,
  type GameEvent,
  HIT_WINDOW_MS,
  HITS_PER_SPEED_STEP,
  MAX_MISSES,
  SPEED_CAP,
  START_SPEED,
  accuracyOf,
  starsFor,
} from "./GameEngine";

function note(lane: Lane, time: number, duration = 100, type: NoteType = "tap"): Note {
  return { lane, time, duration, type };
}

/** Walk the clock through the notes in order, pressing those `shouldPress` allows, then let the run finish. */
function playThrough(engine: GameEngine, notes: Note[], shouldPress: (index: number) => boolean = () => true): void {
  notes.forEach((n, index) => {
    engine.advance(n.time - engine.time);
    if (shouldPress(index)) engine.press(n.lane);
  });
  engine.advance(HIT_WINDOW_MS * 2);
}

describe("speed ramp", () => {
  const taps = Array.from({ length: 170 }, (_, i) => note(0, i * 300));

  it("holds the start speed until the first step of hits", () => {
    const engine = new GameEngine(taps);
    playThrough(engine, taps.slice(0, HITS_PER_SPEED_STEP - 1));
    expect(engine.hits).toBe(HITS_PER_SPEED_STEP - 1);
    expect(engine.speed).toBe(START_SPEED);
  });

  it("adds 20 px/s every 10 hits", () => {
    const engine = new GameEngine(taps);
    playThrough(engine, taps.slice(0, 20));
    expect(engine.hits).toBe(20);
    expect(engine.speed).toBe(START_SPEED + 20 * 2);
  });

  it("emits a speed event at each step", () => {
    const engine = new GameEngine(taps);
    const speeds: number[] = [];
    engine.subscribe((event) => {
      if (event.type === "speed") speeds.push(event.speed);
    });
    playThrough(engine, taps.slice(0, 30));
    expect(speeds).toEqual([320, 340, 360]);
  });

  it("caps at 600 px/s and stays there", () => {
    const engine = new GameEngine(taps);
    playThrough(engine, taps.slice(0, 160));
    expect(engine.hits).toBe(160);
    expect(engine.speed).toBe(SPEED_CAP);
  });

  it("does not step past the cap", () => {
    const engine = new GameEngine(taps);
    const speeds: number[] = [];
    engine.subscribe((event) => {
      if (event.type === "speed") speeds.push(event.speed);
    });
    playThrough(engine, taps.slice(0, 170));
    expect(speeds.at(-1)).toBe(SPEED_CAP);
    expect(speeds.every((speed) => speed <= SPEED_CAP)).toBe(true);
  });
});

describe("fail rule", () => {
  it("ends the run as failed on the third miss, and ignores later notes", () => {
    const notes = [note(0, 0), note(1, 500), note(2, 1000), note(3, 1500)];
    const engine = new GameEngine(notes);
    const events: GameEvent[] = [];
    engine.subscribe((event) => events.push(event));

    engine.advance(1000 + HIT_WINDOW_MS + 1);

    expect(engine.misses).toBe(MAX_MISSES);
    expect(engine.result).toMatchObject({ status: "failed", misses: MAX_MISSES, stars: 0 });
    expect(events.filter((event) => event.type === "end")).toHaveLength(1);
    expect(engine.press(3)).toBe(false);
    expect(engine.tiles[3]?.state).toBe("pending");
  });

  it("does not fail on two misses", () => {
    const notes = [note(0, 0), note(1, 500), note(2, 1000)];
    const engine = new GameEngine(notes);
    playThrough(engine, notes, (index) => index === 2);
    expect(engine.misses).toBe(2);
    expect(engine.result?.status).toBe("cleared");
  });
});

describe("star result", () => {
  it.each([
    [0.5, 1],
    [0.49, 0],
    [0.75, 2],
    [0.74, 1],
    [0.9, 3],
    [0.89, 2],
    [1, 3],
    [0, 0],
  ])("%s accuracy earns %i stars", (accuracy, stars) => {
    expect(starsFor(accuracy)).toBe(stars);
  });

  it("earns no stars when the run failed, whatever the accuracy", () => {
    expect(starsFor(1, true)).toBe(0);
  });

  it("computes accuracy as hits over hits plus misses", () => {
    expect(accuracyOf(3, 1)).toBe(0.75);
    expect(accuracyOf(0, 0)).toBe(0);
  });

  it("reports 2 stars for a cleared run at 80% accuracy", () => {
    const notes = Array.from({ length: 10 }, (_, i) => note((i % 4) as Lane, i * 500));
    const engine = new GameEngine(notes);
    playThrough(engine, notes, (index) => index < 8);

    expect(engine.result).toMatchObject({ status: "cleared", hits: 8, misses: 2, accuracy: 0.8, stars: 2 });
  });
});

describe("hold tiles", () => {
  it("is hit when pressed in its window and held to the end", () => {
    const engine = new GameEngine([note(1, 1000, 800, "hold")]);
    engine.advance(1000);
    expect(engine.press(1)).toBe(true);
    expect(engine.tiles[0]?.state).toBe("holding");

    engine.advance(800);
    expect(engine.tiles[0]?.state).toBe("hit");
    expect(engine.hits).toBe(1);
  });

  it("is missed when lifted well before its end", () => {
    const engine = new GameEngine([note(1, 1000, 800, "hold")]);
    engine.advance(1000);
    engine.press(1);
    engine.advance(200);
    engine.release(1);

    expect(engine.tiles[0]?.state).toBe("missed");
    expect(engine.misses).toBe(1);
  });

  it("is hit when lifted inside the last window", () => {
    const engine = new GameEngine([note(1, 1000, 800, "hold")]);
    engine.advance(1000);
    engine.press(1);
    engine.advance(750);
    engine.release(1);

    expect(engine.tiles[0]?.state).toBe("hit");
  });
});

describe("double tiles", () => {
  it("needs both lanes pressed inside the window", () => {
    const engine = new GameEngine([note(0, 1000, 100, "double")]);
    engine.advance(1000);
    expect(engine.press(0)).toBe(true);
    expect(engine.tiles[0]?.state).toBe("pending");

    expect(engine.press(1)).toBe(true);
    expect(engine.tiles[0]?.state).toBe("hit");
    expect(engine.hits).toBe(1);
  });

  it("is missed when only one lane is pressed before the window closes", () => {
    const engine = new GameEngine([note(3, 1000, 100, "double")]);
    engine.advance(1000);
    engine.press(3);
    engine.advance(HIT_WINDOW_MS + 1);

    expect(engine.tiles[0]?.lanes).toEqual([3, 2]);
    expect(engine.tiles[0]?.state).toBe("missed");
  });
});

describe("presses", () => {
  it("returns false for a press outside every window", () => {
    const engine = new GameEngine([note(2, 1000)]);
    engine.advance(500);
    expect(engine.press(2)).toBe(false);
    expect(engine.hits).toBe(0);
  });

  it("returns false for a lane with no tile in its window", () => {
    const engine = new GameEngine([note(2, 1000)]);
    engine.advance(1000);
    expect(engine.press(0)).toBe(false);
  });
});
