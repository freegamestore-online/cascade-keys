import type { Lane, Note } from "../types";

/** Falling speed at the start of a run, in px per second. */
export const START_SPEED = 300;
/** How much each speed step adds, in px per second. */
export const SPEED_STEP = 20;
/** The falling speed never goes past this, in px per second. */
export const SPEED_CAP = 600;
/** Tiles hit between speed steps. */
export const HITS_PER_SPEED_STEP = 10;
/** Misses that end a song run. Endless runs never end on misses. */
export const MAX_MISSES = 3;
/** How far either side of a tile's time a press still counts, in ms. */
export const HIT_WINDOW_MS = 120;

/** Points for one hit before the combo multiplier. */
export const BASE_POINTS = 100;
/** The combo multiplier stops rising here: x1 for 0 to 9 hits in a row, x2 to 19, and so on. */
export const MAX_MULTIPLIER = 4;

/** Endless mode generates tiles this far ahead of the clock, in ms. */
const ENDLESS_LOOKAHEAD_MS = 4000;
/** Endless mode drops resolved tiles this far behind the judgement clock, to keep the list short. */
const PRUNE_AFTER_MS = 1500;

/** Pitch for each lane, from the lowest band (C4) to the highest (C5). Notes carry bands, not pitches. */
export const LANE_FREQUENCIES: readonly number[] = [261.63, 329.63, 392.0, 523.25];

export type TileState = "pending" | "holding" | "hit" | "missed";

export interface Tile {
  id: number;
  note: Note;
  /** The lanes this tile sits in: one, or two for a double tile. */
  lanes: Lane[];
  state: TileState;
  /** Lanes already struck, for a double tile waiting on its second lane. */
  pressed: Set<Lane>;
}

export interface RunResult {
  status: "cleared" | "failed";
  hits: number;
  misses: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  maxCombo: number;
}

export type GameEvent =
  | { type: "hit"; tile: Tile }
  | { type: "miss"; tile: Tile }
  | { type: "speed"; speed: number }
  | { type: "end"; result: RunResult };

/** Supplies notes in time order, without end. Endless mode uses one. */
export interface NoteSource {
  next(): Note;
}

export interface GameOptions {
  /**
   * The audio/visual latency measured by calibration, in ms. A tap at time T is judged
   * as if it were at T - offset. Positive means the player taps late.
   */
  latencyOffsetMs?: number;
  /** Generate tiles without end, and never fail. Without it, the notes passed in are the whole song. */
  endless?: NoteSource;
}

/** hits / (hits + misses). A run with nothing resolved has no accuracy, so it reads as 0. */
export function accuracyOf(hits: number, misses: number): number {
  const total = hits + misses;
  return total === 0 ? 0 : hits / total;
}

/** 1 star at 50% accuracy, 2 at 75%, 3 at 90%. A failed run earns none. */
export function starsFor(accuracy: number, failed = false): 0 | 1 | 2 | 3 {
  if (failed) return 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}

/** The score multiplier for a combo: it rises by one every ten hits in a row, up to MAX_MULTIPLIER. */
export function multiplierFor(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 10));
}

/** The second lane of a double tile: the neighbour of its lane, on the side that exists. */
function partnerLane(lane: Lane): Lane {
  return lane < 3 ? ((lane + 1) as Lane) : ((lane - 1) as Lane);
}

function lanesOf(note: Note): Lane[] {
  return note.type === "double" ? [note.lane, partnerLane(note.lane)] : [note.lane];
}

/** When a tile's sounding ends. For a hold, this is when it must still be held to count. */
export function tileEnd(tile: Tile): number {
  return tile.note.time + tile.note.duration;
}

function isResolved(tile: Tile): boolean {
  return tile.state === "hit" || tile.state === "missed";
}

/**
 * The rules of a run, with no DOM or audio. Time is the run's own clock in ms: the caller
 * advances it, presses and releases lanes, and listens for events.
 *
 * - A tap is hit by a press within HIT_WINDOW_MS of its time.
 * - A hold is hit by a press in that window and then kept down until its end. Lifting
 *   early before the last HIT_WINDOW_MS is a miss.
 * - A double tile needs its lane and its partner lane pressed inside the window.
 * - Every judgement uses the clock shifted by the latency offset.
 * - The speed rises by SPEED_STEP every HITS_PER_SPEED_STEP hits, up to SPEED_CAP.
 * - Each hit scores BASE_POINTS times the combo multiplier. A miss resets the combo.
 * - In a song, MAX_MISSES misses end the run as failed, with no stars. In endless mode the
 *   run never ends, and tiles keep coming from the note source.
 */
export class GameEngine {
  /** The live tiles. Endless runs drop old resolved tiles, so this list stays short. */
  tiles: Tile[];
  private clock = 0;
  private hitCount = 0;
  private missCount = 0;
  private comboCount = 0;
  private bestCombo = 0;
  private points = 0;
  private currentSpeed = START_SPEED;
  private ended: RunResult | null = null;
  private listeners = new Set<(event: GameEvent) => void>();
  private readonly offsetMs: number;
  private readonly endless: NoteSource | undefined;
  private nextId: number;

  constructor(notes: readonly Note[], options: GameOptions = {}) {
    this.offsetMs = options.latencyOffsetMs ?? 0;
    this.endless = options.endless;
    this.tiles = [...notes]
      .sort((a, b) => a.time - b.time)
      .map((note, id): Tile => ({ id, note, lanes: lanesOf(note), state: "pending", pressed: new Set<Lane>() }));
    this.nextId = this.tiles.length;
    this.fillEndless();
  }

  /** Time into the run, in ms. */
  get time(): number {
    return this.clock;
  }

  get speed(): number {
    return this.currentSpeed;
  }

  get hits(): number {
    return this.hitCount;
  }

  get misses(): number {
    return this.missCount;
  }

  get combo(): number {
    return this.comboCount;
  }

  get maxCombo(): number {
    return this.bestCombo;
  }

  get score(): number {
    return this.points;
  }

  get accuracy(): number {
    return accuracyOf(this.hitCount, this.missCount);
  }

  /** The final result once a song run has ended, otherwise null. Endless runs never produce one. */
  get result(): RunResult | null {
    return this.ended;
  }

  /** Listen for hits, misses, speed steps and the end of the run. Returns an unsubscribe function. */
  subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Move the clock forward by `dtMs` and resolve any tile whose window has passed. */
  advance(dtMs: number): void {
    if (this.ended) return;
    this.clock += dtMs;
    const now = this.judgedTime();
    for (const tile of this.tiles) {
      if (isResolved(tile)) continue;
      if (tile.state === "holding") {
        if (now >= tileEnd(tile)) this.resolve(tile, "hit");
      } else if (now > tile.note.time + HIT_WINDOW_MS) {
        this.resolve(tile, "missed");
      }
    }
    this.fillEndless();
    this.prune();
    this.checkEnd();
  }

  /**
   * Strike a lane. Returns true when the press lands on a tile, so the caller can sound it.
   * Presses that match no tile in its window return false and count for nothing.
   */
  press(lane: Lane): boolean {
    if (this.ended) return false;
    const tile = this.targetFor(lane);
    if (!tile) return false;

    if (tile.note.type === "hold") {
      tile.state = "holding";
    } else {
      tile.pressed.add(lane);
      if (tile.pressed.size === tile.lanes.length) this.resolve(tile, "hit");
    }
    this.checkEnd();
    return true;
  }

  /** Lift a lane. Lifting a hold early before its last window is a miss. */
  release(lane: Lane): void {
    if (this.ended) return;
    const tile = this.tiles.find((t) => t.state === "holding" && t.lanes.includes(lane));
    if (!tile) return;
    if (this.judgedTime() < tileEnd(tile) - HIT_WINDOW_MS) {
      this.resolve(tile, "missed");
    } else {
      this.resolve(tile, "hit");
    }
    this.checkEnd();
  }

  /** The run clock with the latency offset taken off: a tap at T is judged at T - offset. */
  private judgedTime(): number {
    return this.clock - this.offsetMs;
  }

  private targetFor(lane: Lane): Tile | undefined {
    const now = this.judgedTime();
    let best: Tile | undefined;
    let bestGap = Infinity;
    for (const tile of this.tiles) {
      if (tile.state !== "pending" || !tile.lanes.includes(lane) || tile.pressed.has(lane)) continue;
      const gap = Math.abs(now - tile.note.time);
      if (gap <= HIT_WINDOW_MS && gap < bestGap) {
        best = tile;
        bestGap = gap;
      }
    }
    return best;
  }

  private resolve(tile: Tile, outcome: "hit" | "missed"): void {
    tile.state = outcome;
    if (outcome === "hit") {
      this.hitCount += 1;
      this.comboCount += 1;
      this.bestCombo = Math.max(this.bestCombo, this.comboCount);
      this.points += BASE_POINTS * multiplierFor(this.comboCount);
      this.emit({ type: "hit", tile });
      if (this.hitCount % HITS_PER_SPEED_STEP === 0 && this.currentSpeed < SPEED_CAP) {
        this.currentSpeed = Math.min(SPEED_CAP, this.currentSpeed + SPEED_STEP);
        this.emit({ type: "speed", speed: this.currentSpeed });
      }
    } else {
      this.missCount += 1;
      this.comboCount = 0;
      this.emit({ type: "miss", tile });
    }
  }

  private fillEndless(): void {
    if (!this.endless) return;
    while (this.tiles.length === 0 || (this.tiles.at(-1)?.note.time ?? 0) < this.clock + ENDLESS_LOOKAHEAD_MS) {
      const note = this.endless.next();
      this.tiles.push({ id: this.nextId++, note, lanes: lanesOf(note), state: "pending", pressed: new Set<Lane>() });
    }
  }

  private prune(): void {
    if (!this.endless) return;
    const cutoff = this.judgedTime() - PRUNE_AFTER_MS;
    this.tiles = this.tiles.filter((tile) => !(isResolved(tile) && tileEnd(tile) < cutoff));
  }

  private checkEnd(): void {
    if (this.ended || this.endless) return;
    const failed = this.missCount >= MAX_MISSES;
    const finished = this.tiles.every(isResolved);
    if (!failed && !finished) return;

    const accuracy = this.accuracy;
    this.ended = {
      status: failed ? "failed" : "cleared",
      hits: this.hitCount,
      misses: this.missCount,
      accuracy,
      stars: starsFor(accuracy, failed),
      score: this.points,
      maxCombo: this.bestCombo,
    };
    this.emit({ type: "end", result: this.ended });
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
