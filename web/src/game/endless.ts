import type { Lane, Note, NoteType } from "../types";
import type { NoteSource } from "./GameEngine";

/** The gap between tiles at the start of endless play, in ms. */
export const ENDLESS_START_GAP_MS = 600;
/** The tightest gap endless play reaches, in ms. */
export const ENDLESS_MIN_GAP_MS = 320;
/** How much the gap closes per second of play, in ms. */
const GAP_CLOSE_PER_SECOND_MS = 8;
/** Time before the first tile, in ms, so the player can see the lanes. */
const LEAD_IN_MS = 1500;

/** The gap between tiles at a moment of play. It closes gradually, from the start gap to the minimum. */
export function endlessGapMs(timeMs: number): number {
  return Math.max(ENDLESS_MIN_GAP_MS, ENDLESS_START_GAP_MS - (timeMs / 1000) * GAP_CLOSE_PER_SECOND_MS);
}

/**
 * Random tiles for endless play: a random lane each time, mostly taps with some holds and
 * doubles, and a gap that closes as the run goes on. `random` returns values in [0, 1).
 */
export class EndlessGenerator implements NoteSource {
  private time = LEAD_IN_MS;

  constructor(private readonly random: () => number = Math.random) {}

  next(): Note {
    const gap = endlessGapMs(this.time);
    const roll = this.random();
    const type: NoteType = roll < 0.1 ? "double" : roll < 0.25 ? "hold" : "tap";
    const lane = Math.min(3, Math.floor(this.random() * 4)) as Lane;
    const duration = type === "hold" ? gap * 1.5 : gap * 0.5;
    const note: Note = { lane, time: Math.round(this.time), duration: Math.round(duration), type };
    this.time += gap;
    return note;
  }
}
