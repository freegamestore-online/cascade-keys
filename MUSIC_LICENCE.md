# Music licence

Every piece in `web/src/data/tracks.ts` is public domain, for two reasons:

- **Composed works:** each composer died before 1925, so the work is out of copyright.
  The death year is recorded on each entry and `web/src/test/tracks.test.ts` fails CI if
  one is 1925 or later.
- **Traditional tunes:** folk melodies with no known composer. Their `deathYear` is `null`.

## What is in the repo

- Note data only: the pitch band and timing of each melody, hand-transcribed into
  `web/src/data/tracks.ts`.
- No recordings and no third-party MIDI files. Every sound comes from the game's own
  synthesised engine.
- Each entry names its `source`. Composed works cite the public-domain score. The
  transcriptions have not yet been checked note-by-note against the scores on IMSLP, and
  that check is still to do.

## Adding a track

Only add a work if its composer died before 1925 or it is a traditional tune. Record the
composer, the death year and the source on the entry, and keep the test passing.
