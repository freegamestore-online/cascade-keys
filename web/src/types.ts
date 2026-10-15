/** One of the four falling lanes, from the lowest pitch band (0) to the highest (3). */
export type Lane = 0 | 1 | 2 | 3;

/** A tap is struck once, a hold is kept down for its duration, a double is struck with its neighbour. */
export type NoteType = "tap" | "hold" | "double";

/** A note to hit. `time` and `duration` are in milliseconds from the start of the track. */
export interface Note {
  lane: Lane;
  time: number;
  duration: number;
  type: NoteType;
}

/** A song on the list. `deathYear` is null for traditional tunes, which have no composer to date. */
export interface Track {
  id: string;
  title: string;
  composer: string;
  deathYear: number | null;
  source: string;
  notes: Note[];
}

export interface AppState {
  // Define your app state here
}
