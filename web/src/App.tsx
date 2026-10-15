import { type ReactNode, useState } from "react";
import { GameButton, useLeaderboard } from "@freegamestore/games";
import { GameShell } from "./GameShell";
import { CascadeKeys } from "./game/CascadeKeys";
import { LatencyCalibration } from "./game/LatencyCalibration";
import { Leaderboard } from "./game/Leaderboard";
import type { RunResult } from "./game/GameEngine";
import { tracks } from "./data/tracks";
import { dailyIndex, dayKey } from "./lib/daily";
import { ENDLESS_ID, type DailyScore, loadBest, loadDaily, saveBest, saveDaily, starSummary } from "./lib/scores";
import { defaultStore } from "./lib/storage";
import type { Track } from "./types";

/** The platform's id for this game, as set in the store listing. */
const GAME_ID = "cascade-keys";

/** The screens of the game. Navigation is in state, not the URL: the static host has no fallback for deep links. */
type Screen =
  | { kind: "listing" }
  | { kind: "modes" }
  | { kind: "songs" }
  | { kind: "play"; track: Track; daily: boolean }
  | { kind: "daily-done"; track: Track; saved: DailyScore }
  | { kind: "arcade" }
  | { kind: "calibrate" }
  | { kind: "leaderboard" };

const DESCRIPTION =
  "Tap four lanes in time with melodies by composers who died before 1925 and traditional folk songs. " +
  "Every correct tap plays the next note on a synthesised piano. Hit holds and doubles, watch the tempo climb, " +
  "and earn up to three stars a song. Arcade mode has no end. The daily song is the same for everyone, once a day. " +
  "Your scores stay on this device.";

function starText(count: number): string {
  return "★".repeat(count) + "☆".repeat(3 - count);
}

/** The song for a moment's daily challenge. Every device picks the same one on the same UTC day. */
function dailyTrackAt(timestampMs: number): Track {
  return tracks[dailyIndex(timestampMs, tracks.length)] ?? tracks[0]!;
}

/**
 * Keep the song's best result, and for a daily run also the first result of the day.
 * Returns true only when this is the day's first daily result, which is the one that goes to the leaderboard.
 */
function recordSongResult(track: Track, result: RunResult, daily: boolean): boolean {
  const store = defaultStore();
  const date = dayKey(Date.now());
  saveBest(store, track.id, { score: result.score, stars: result.stars, date });
  return daily && saveDaily(store, { songId: track.id, score: result.score, stars: result.stars, date });
}

function recordArcadeResult(score: number): void {
  if (score <= 0) return;
  saveBest(defaultStore(), ENDLESS_ID, { score, stars: 0, date: dayKey(Date.now()) });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "listing" });
  // The day the page was opened on decides the daily song, so it does not change under the player.
  const [openedAt] = useState(() => Date.now());
  const { submitScore } = useLeaderboard(GAME_ID);
  const store = defaultStore();
  const listing = () => setScreen({ kind: "listing" });
  const dailyTrack = dailyTrackAt(openedAt);
  const stars = starSummary(
    store,
    tracks.map((track) => track.id),
    dayKey(openedAt),
  );

  function openDaily() {
    const saved = loadDaily(store, dayKey(openedAt));
    setScreen(saved ? { kind: "daily-done", track: dailyTrack, saved } : { kind: "play", track: dailyTrack, daily: true });
  }

  function sendDailyScore(score: number) {
    // submitScore never rejects. A reply of { ok: false }, such as "Invalid game" or a signed-out player,
    // is expected here: the local record is already kept, so nothing is shown.
    void submitScore(score);
  }

  function body(): ReactNode {
    switch (screen.kind) {
      case "listing":
        return (
          <div className="cascade-panel listing">
            <img className="listing-thumb" src="/thumbnail.svg" alt="Four lanes of falling tiles above a glowing hit line" />
            <h1 className="listing-title">Cascade Keys</h1>
            <p className="listing-description">{DESCRIPTION}</p>
            <p className="listing-stars" aria-label={`${stars.earned} of ${stars.possible} stars earned`}>
              ★ {stars.earned} of {stars.possible} stars earned
              {stars.daily !== null && ` · today’s daily ${starText(stars.daily)}`}
            </p>
            <div className="cascade-actions">
              <GameButton size="lg" block onClick={() => setScreen({ kind: "modes" })}>
                Play
              </GameButton>
            </div>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={() => setScreen({ kind: "calibrate" })}>
                Calibrate audio
              </GameButton>
              <GameButton variant="ghost" size="sm" onClick={() => setScreen({ kind: "leaderboard" })}>
                Leaderboard
              </GameButton>
            </div>
          </div>
        );

      case "modes":
        return (
          <div className="cascade-panel">
            <h1 className="song-heading">Choose a mode</h1>
            <div className="cascade-menu">
              <GameButton block onClick={() => setScreen({ kind: "songs" })}>
                Songs · {tracks.length} tunes
              </GameButton>
              <GameButton block variant="secondary" onClick={() => setScreen({ kind: "arcade" })}>
                Arcade · endless, no fail
              </GameButton>
              <GameButton block variant="secondary" onClick={openDaily}>
                Daily Challenge · {dailyTrack.title}
              </GameButton>
            </div>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={listing}>
                Back
              </GameButton>
            </div>
          </div>
        );

      case "songs":
        return (
          <>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={() => setScreen({ kind: "modes" })}>
                Back
              </GameButton>
            </div>
            <h1 className="song-heading">Choose a song</h1>
            <ul className="song-list">
              {tracks.map((item) => {
                const best = loadBest(store, item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="song-row"
                      onClick={() => setScreen({ kind: "play", track: item, daily: false })}
                    >
                      <span className="song-title">{item.title}</span>
                      <span className="song-composer">
                        {item.composer}
                        {best ? ` · ${starText(best.stars)} · best ${best.score}` : " · not played"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        );

      case "play":
        return (
          <CascadeKeys
            key={`${screen.track.id}-${screen.daily ? "daily" : "song"}`}
            track={screen.track}
            daily={screen.daily}
            onExit={() => setScreen(screen.daily ? { kind: "modes" } : { kind: "songs" })}
            onFinish={(result) => {
              if (recordSongResult(screen.track, result, screen.daily)) sendDailyScore(result.score);
            }}
          />
        );

      case "daily-done":
        return (
          <div className="cascade-panel">
            <p className="song-composer">Daily Challenge · already played today</p>
            <h1 className="song-heading">{tracks.find((t) => t.id === screen.saved.songId)?.title ?? screen.track.title}</h1>
            <p className="cascade-stars" aria-label={`${screen.saved.stars} of 3 stars`}>
              {starText(screen.saved.stars)}
            </p>
            <p>Score {screen.saved.score}. Come back tomorrow for the next song.</p>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={() => setScreen({ kind: "modes" })}>
                Back
              </GameButton>
            </div>
          </div>
        );

      case "arcade":
        return (
          <CascadeKeys
            track={null}
            onExit={() => setScreen({ kind: "modes" })}
            onEndlessQuit={(score) => recordArcadeResult(score)}
          />
        );

      case "calibrate":
        return <LatencyCalibration onExit={listing} />;

      case "leaderboard":
        return <Leaderboard onExit={listing} />;
    }
  }

  return <GameShell>{body()}</GameShell>;
}
