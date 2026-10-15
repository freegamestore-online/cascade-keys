import type { Lane, Note, NoteType, Track } from "../types";

/**
 * The song list. Every melody is hand-transcribed as note data: this file holds
 * the notes, not recordings, and no third-party MIDI is used. Lanes 0 to 3 run from
 * the lowest pitch band of each melody to the highest. The licence check is in
 * MUSIC_LICENCE.md, and web/src/test/tracks.test.ts fails if a composer is too recent.
 */

/** A note as [lane, start beat, length in beats, type]. Beats convert to ms at the piece's tempo. */
type Row = [Lane, number, number, NoteType?];

/** Turn beat-based rows into timed notes. Each tap lasts for its written length. */
function score(bpm: number, rows: Row[]): Note[] {
  const beatMs = 60_000 / bpm;
  return rows.map(([lane, start, length, type = "tap"]) => ({
    lane,
    time: Math.round(start * beatMs),
    duration: Math.max(1, Math.round(length * beatMs)),
    type,
  }));
}

/** A run of evenly spaced notes that cycles through `lanes`, for arpeggios and figuration. */
function run(start: number, count: number, step: number, lanes: Lane[]): Row[] {
  return Array.from({ length: count }, (_, i): Row => [lanes[i % lanes.length]!, start + i * step, step]);
}

const SCORE = "Public-domain score; melody hand-transcribed, not yet checked against IMSLP";
const FOLK = "Traditional folk melody; hand-transcribed";

export const tracks: Track[] = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy",
    composer: "Ludwig van Beethoven",
    deathYear: 1827,
    source: SCORE,
    notes: score(84, [
      [1, 0, 1], [1, 1, 1], [1, 2, 1], [2, 3, 1], [2, 4, 1], [1, 5, 1], [1, 6, 1], [0, 7, 1],
      [0, 8, 1], [0, 9, 1], [0, 10, 1], [1, 11, 1], [1, 12, 1.5], [0, 13.5, 0.5], [0, 14, 2, "hold"],
      [1, 16, 1], [1, 17, 1], [1, 18, 1], [2, 19, 1], [2, 20, 1], [1, 21, 1], [1, 22, 1], [0, 23, 1],
      [0, 24, 1], [0, 25, 1], [0, 26, 1], [1, 27, 1], [0, 28, 1.5], [0, 29.5, 0.5], [0, 30, 2, "hold"],
    ]),
  },
  {
    id: "fur-elise",
    title: "Für Elise",
    composer: "Ludwig van Beethoven",
    deathYear: 1827,
    source: SCORE,
    notes: score(66, [
      [3, 0, 0.5], [3, 0.5, 0.5], [3, 1, 0.5], [3, 1.5, 0.5], [3, 2, 0.5], [2, 2.5, 0.5], [2, 3, 0.5], [2, 3.5, 0.5],
      [1, 4, 1], [2, 5, 0.5], [3, 5.5, 0.5], [1, 6, 0.5], [2, 6.5, 0.5], [2, 7, 1],
      [3, 8, 0.5], [3, 8.5, 0.5], [3, 9, 0.5], [3, 9.5, 0.5], [3, 10, 0.5], [2, 10.5, 0.5], [2, 11, 0.5], [2, 11.5, 0.5],
      [1, 12, 1], [2, 13, 0.5], [3, 13.5, 0.5], [1, 14, 1],
    ]),
  },
  {
    id: "moonlight-sonata",
    title: "Moonlight Sonata, first movement",
    composer: "Ludwig van Beethoven",
    deathYear: 1827,
    source: SCORE,
    notes: score(60, [
      ...run(0, 12, 1 / 3, [0, 1, 2]),
      [3, 4, 2], [3, 6, 1], [2, 7, 1], [3, 8, 2, "hold"], [2, 10, 1], [1, 11, 1],
      ...run(12, 12, 1 / 3, [0, 1, 2]),
      [3, 16, 2], [2, 18, 1], [1, 19, 1],
    ]),
  },
  {
    id: "pathetique-theme",
    title: "Pathétique Sonata, slow movement theme",
    composer: "Ludwig van Beethoven",
    deathYear: 1827,
    source: SCORE,
    notes: score(66, [
      [1, 0, 2], [2, 2, 1], [2, 3, 1], [3, 4, 2, "hold"], [2, 6, 1], [1, 7, 1],
      [0, 8, 2], [1, 10, 1], [2, 11, 1], [1, 12, 3, "hold"], [2, 15, 1], [3, 16, 2],
    ]),
  },
  {
    id: "nocturne-op9-no2",
    title: "Nocturne in E-flat, Op. 9 No. 2",
    composer: "Frédéric Chopin",
    deathYear: 1849,
    source: SCORE,
    notes: score(66, [
      [2, 0, 1.5], [1, 1.5, 0.5], [2, 2, 1], [3, 3, 1], [3, 4, 2, "hold"], [2, 6, 1], [1, 7, 1],
      [2, 8, 1.5], [1, 9.5, 0.5], [0, 10, 2, "hold"], [1, 12, 1], [2, 13, 1], [3, 14, 2],
    ]),
  },
  {
    id: "waltz-op64-no2",
    title: "Waltz in C-sharp minor, Op. 64 No. 2",
    composer: "Frédéric Chopin",
    deathYear: 1849,
    source: SCORE,
    notes: score(120, [
      [3, 0, 1], [2, 1, 0.5], [2, 1.5, 0.5], [2, 2, 1], [3, 3, 1], [3, 4, 0.5], [3, 4.5, 0.5], [2, 5, 1],
      [1, 6, 1], [2, 7, 1], [3, 8, 1], [3, 9, 1], [2, 10, 1], [1, 11, 1], [2, 12, 1],
      [3, 13, 1], [3, 14, 0.5], [2, 14.5, 0.5], [2, 15, 1], [3, 16, 2, "hold"],
    ]),
  },
  {
    id: "raindrop-prelude",
    title: "Raindrop Prelude, Op. 28 No. 15",
    composer: "Frédéric Chopin",
    deathYear: 1849,
    source: SCORE,
    notes: score(60, [
      ...run(0, 16, 0.25, [2]),
      [3, 4, 2, "hold"], [3, 6, 1], [2, 7, 1],
    ]),
  },
  {
    id: "ave-maria",
    title: "Ave Maria",
    composer: "Franz Schubert",
    deathYear: 1828,
    source: SCORE,
    notes: score(66, [
      [1, 0, 2], [2, 2, 1], [2, 3, 1], [3, 4, 2, "hold"], [2, 6, 1], [1, 7, 1],
      [2, 8, 2], [1, 10, 1], [0, 11, 1], [1, 12, 2], [2, 14, 1], [3, 15, 1],
      [2, 16, 2, "hold"], [1, 18, 2], [0, 20, 2, "hold"],
    ]),
  },
  {
    id: "serenade",
    title: "Serenade (Ständchen)",
    composer: "Franz Schubert",
    deathYear: 1828,
    source: SCORE,
    notes: score(66, [
      [2, 0, 1], [2, 1, 1], [1, 2, 1], [0, 3, 1], [1, 4, 1], [2, 5, 1], [3, 6, 2, "hold"],
      [2, 8, 1], [1, 9, 1], [2, 10, 1], [3, 11, 1], [3, 12, 2], [2, 14, 1], [1, 15, 1], [0, 16, 2, "hold"],
    ]),
  },
  {
    id: "wiegenlied",
    title: "Lullaby (Wiegenlied)",
    composer: "Johannes Brahms",
    deathYear: 1897,
    source: SCORE,
    notes: score(84, [
      [2, 0, 1], [2, 1, 0.5], [2, 1.5, 0.5], [3, 2, 1], [2, 3, 1], [1, 4, 1], [1, 5, 1], [0, 6, 1],
      [1, 7, 1], [2, 8, 1], [2, 9, 1], [3, 10, 1], [2, 11, 1], [1, 12, 2, "hold"], [0, 14, 2, "hold"],
    ]),
  },
  {
    id: "clair-de-lune",
    title: "Clair de Lune, opening",
    composer: "Claude Debussy",
    deathYear: 1918,
    source: SCORE,
    notes: score(60, [
      [1, 0, 1], [2, 1, 1], [3, 2, 2, "hold"], [2, 4, 1], [1, 5, 1], [1, 6, 2, "hold"],
      [2, 8, 1], [3, 9, 1], [2, 10, 2], [1, 12, 1], [2, 13, 1], [3, 14, 2],
    ]),
  },
  {
    id: "arabesque-no1",
    title: "Arabesque No. 1",
    composer: "Claude Debussy",
    deathYear: 1918,
    source: SCORE,
    notes: score(100, [
      ...run(0, 16, 0.5, [1, 2, 3, 2]),
      [3, 8, 1], [2, 9, 1], [1, 10, 2, "hold"], [2, 12, 1], [3, 13, 1], [3, 14, 2, "hold"],
    ]),
  },
  {
    id: "scarborough-fair",
    title: "Scarborough Fair",
    composer: "Traditional",
    deathYear: null,
    source: FOLK,
    notes: score(84, [
      [1, 0, 1], [1, 1, 1], [2, 2, 1], [1, 3, 1], [0, 4, 1], [1, 5, 2, "hold"], [2, 7, 1], [2, 8, 1],
      [3, 9, 1], [2, 10, 2, "hold"], [1, 12, 1], [2, 13, 1], [1, 14, 2, "hold"], [0, 16, 2],
      [1, 18, 1], [2, 19, 1], [2, 20, 2, "hold"], [3, 22, 1], [2, 23, 1], [1, 24, 2, "hold"], [0, 26, 2],
    ]),
  },
  {
    id: "greensleeves",
    title: "Greensleeves",
    composer: "Traditional",
    deathYear: null,
    source: FOLK,
    notes: score(80, [
      [1, 0, 1], [2, 1, 1], [2, 2, 1], [3, 3, 1], [3, 4, 1.5], [2, 5.5, 0.5], [2, 6, 1], [1, 7, 1],
      [1, 8, 1], [1, 9, 1], [2, 10, 0.5], [2, 10.5, 0.5], [2, 11, 1], [3, 12, 1], [3, 13, 1], [2, 14, 1],
      [1, 15, 2, "hold"], [0, 17, 1], [1, 18, 1], [2, 19, 1],
    ]),
  },
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    composer: "Traditional",
    deathYear: null,
    source: FOLK,
    notes: score(72, [
      [1, 0, 1], [2, 1, 2, "hold"], [3, 3, 1], [2, 4, 2, "hold"], [1, 6, 1], [2, 7, 2, "hold"],
      [3, 9, 1], [2, 10, 1], [1, 11, 1], [2, 12, 2, "hold"], [3, 14, 1], [2, 15, 1],
    ]),
  },
  {
    id: "danny-boy",
    title: "Danny Boy",
    composer: "Traditional",
    deathYear: null,
    source: FOLK,
    notes: score(66, [
      [2, 0, 1], [3, 1, 1], [2, 2, 1], [1, 3, 1], [1, 4, 1], [2, 5, 1], [2, 6, 2, "hold"],
      [3, 8, 1], [2, 9, 1], [1, 10, 1], [0, 11, 1], [1, 12, 2, "hold"], [2, 14, 1], [1, 15, 1], [0, 16, 2, "hold"],
    ]),
  },
  {
    id: "minuet-in-g",
    title: "Minuet in G",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(110, [
      [3, 0, 1], [0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 4, 1], [2, 5, 1], [3, 6, 1], [2, 7, 1],
      [1, 8, 1], [1, 9, 1], [0, 10, 1], [1, 11, 1], [2, 12, 1], [3, 13, 1], [3, 14, 1], [2, 15, 1],
      [1, 16, 1], [0, 17, 1], [0, 18, 1], [1, 19, 1], [2, 20, 1], [3, 21, 1], [2, 22, 1], [0, 23, 2, "hold"],
    ]),
  },
  {
    id: "prelude-in-c",
    title: "Prelude in C, BWV 846",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(100, [
      ...run(0, 16, 0.25, [0, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 0, 1]),
      ...run(4, 16, 0.25, [0, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 0, 1]),
    ]),
  },
  {
    id: "toccata-d-minor",
    title: "Toccata and Fugue in D minor, opening",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(100, [
      [2, 0, 0.5], [1, 0.5, 0.5], [2, 1, 0.5], [1, 1.5, 0.5], [0, 2, 2, "hold"], [1, 4, 1],
      [2, 5, 0.5], [1, 5.5, 0.5], [2, 6, 1], [0, 7, 1], [3, 8, 2, "hold"], [2, 10, 1],
    ]),
  },
  {
    id: "invention-1",
    title: "Invention No. 1 in C, BWV 772",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(100, [
      ...run(0, 8, 0.25, [2, 2, 3, 2]),
      ...run(2, 8, 0.25, [3, 3, 2, 2]),
      [3, 4, 2, "hold"], [2, 6, 1], [1, 7, 1], [2, 8, 2, "hold"],
    ]),
  },
  {
    id: "invention-13",
    title: "Invention No. 13 in A minor, BWV 784",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(100, [
      [3, 0, 0.5], [2, 0.5, 0.5], [3, 1, 0.5], [2, 1.5, 0.5], [1, 2, 0.5], [2, 2.5, 0.5], [3, 3, 1],
      [2, 4, 0.5], [1, 4.5, 0.5], [2, 5, 1], [1, 6, 1], [0, 7, 1],
    ]),
  },
  {
    id: "air-on-g-string",
    title: "Air on the G String",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(66, [
      [3, 0, 2, "hold"], [2, 2, 2, "hold"], [1, 4, 2, "hold"], [2, 6, 2, "hold"], [3, 8, 2, "hold"],
      [2, 10, 1], [1, 11, 1], [2, 12, 2, "hold"], [1, 14, 1], [2, 15, 1], [3, 16, 2, "hold"],
    ]),
  },
  {
    id: "jesu-joy",
    title: "Jesu, Joy of Man's Desiring",
    composer: "Johann Sebastian Bach",
    deathYear: 1750,
    source: SCORE,
    notes: score(72, [
      [2, 0, 1], [3, 1, 1], [3, 2, 1], [2, 3, 1], [1, 4, 2, "hold"], [2, 6, 1], [3, 7, 1],
      [2, 8, 1], [1, 9, 1], [0, 10, 1], [1, 11, 1], [2, 12, 2, "hold"], [3, 14, 1], [2, 15, 1],
    ]),
  },
  {
    id: "twinkle",
    title: "Twinkle, Twinkle, Little Star",
    composer: "Wolfgang Amadeus Mozart",
    deathYear: 1791,
    source: SCORE,
    notes: score(100, [
      [0, 0, 1], [0, 1, 1], [3, 2, 1], [3, 3, 1], [3, 4, 1], [3, 5, 1], [2, 6, 2, "hold"],
      [2, 8, 1], [2, 9, 1], [1, 10, 1], [1, 11, 1], [1, 12, 1], [1, 13, 1], [0, 14, 2, "hold"],
    ]),
  },
  {
    id: "eine-kleine-nachtmusik",
    title: "Eine kleine Nachtmusik, opening",
    composer: "Wolfgang Amadeus Mozart",
    deathYear: 1791,
    source: SCORE,
    notes: score(130, [
      [1, 0, 1], [2, 1, 1], [3, 2, 2, "hold"], [2, 4, 1], [1, 5, 1], [1, 6, 1], [2, 7, 1],
      [3, 8, 1], [2, 9, 1], [1, 10, 1], [0, 11, 1], [1, 12, 2, "hold"], [2, 14, 1], [3, 15, 1],
    ]),
  },
  {
    id: "piano-sonata-k331",
    title: "Piano Sonata in A, K. 331, theme",
    composer: "Wolfgang Amadeus Mozart",
    deathYear: 1791,
    source: SCORE,
    notes: score(88, [
      [2, 0, 1], [2, 1, 0.5], [3, 1.5, 0.5], [2, 2, 1], [1, 3, 1], [2, 4, 1], [3, 5, 1],
      [2, 6, 1], [1, 7, 1], [1, 8, 2, "hold"], [2, 10, 1], [1, 11, 1], [0, 12, 2, "hold"], [1, 14, 1], [2, 15, 1],
    ]),
  },
  {
    id: "rondo-alla-turca",
    title: "Rondo alla Turca",
    composer: "Wolfgang Amadeus Mozart",
    deathYear: 1791,
    source: SCORE,
    notes: score(140, [
      ...run(0, 8, 0.5, [3, 2]),
      ...run(4, 8, 0.5, [3, 2, 1, 2]),
      [3, 8, 1, "double"], [2, 9, 1], [3, 10, 2, "hold"],
    ]),
  },
];
