import { type ReactNode, useState } from "react";
import { GameButton } from "@freegamestore/games";
import { GameShell } from "./GameShell";
import { CascadeKeys } from "./game/CascadeKeys";
import { LatencyCalibration } from "./game/LatencyCalibration";
import { Leaderboard } from "./game/Leaderboard";
import type { RunResult } from "./game/GameEngine";
import { tracks } from "./data/tracks";
import { dailyIndex, dayKey } from "./lib/daily";
import { ENDLESS_ID, type DailyScore, loadBest, loadDaily, saveBest, saveDaily } from "./lib/scores";
import { defaultStore } from "./lib/storage";
import type { Track } from "./types";

/** The screens of the game. Navigation is in state, not the URL: the static host has no fallback for deep links. */
type Screen =
  | { kind: "menu" }
  | { kind: "songs" }
  | { kind: "play"; track: Track; daily: boolean }
  | { kind: "daily-done"; track: Track; saved: DailyScore }
  | { kind: "endless" }
  | { kind: "calibrate" }
  | { kind: "leaderboard" };

function starText(count: number): string {
  return "★".repeat(count) + "☆".repeat(3 - count);
}

/** The song for a moment's daily challenge. Every device picks the same one on the same UTC day. */
function dailyTrackAt(timestampMs: number): Track {
  return tracks[dailyIndex(timestampMs, tracks.length)] ?? tracks[0]!;
}

/** Keep the song's best result, and for a daily run also the first result of the day. */
function recordSongResult(track: Track, result: RunResult, daily: boolean): void {
  const store = defaultStore();
  const date = dayKey(Date.now());
  saveBest(store, track.id, { score: result.score, stars: result.stars, date });
  if (daily) saveDaily(store, { songId: track.id, score: result.score, stars: result.stars, date });
}

function recordEndlessResult(score: number): void {
  if (score <= 0) return;
  saveBest(defaultStore(), ENDLESS_ID, { score, stars: 0, date: dayKey(Date.now()) });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  // The day the page was opened on decides the daily song, so it does not change under the player.
  const [openedAt] = useState(() => Date.now());
  const menu = () => setScreen({ kind: "menu" });
  const store = defaultStore();

  function openDaily() {
    const track = dailyTrackAt(openedAt);
    const saved = loadDaily(store, dayKey(openedAt));
    setScreen(saved ? { kind: "daily-done", track, saved } : { kind: "play", track, daily: true });
  }

  function body(): ReactNode {
    switch (screen.kind) {
      case "menu":
        return (
          <div className="cascade-panel">
            <h1 className="song-heading">Cascade Keys</h1>
            <div className="cascade-menu">
              <GameButton block onClick={() => setScreen({ kind: "songs" })}>
                Play
              </GameButton>
              <GameButton block variant="secondary" onClick={openDaily}>
                Daily Challenge
              </GameButton>
              <GameButton block variant="secondary" onClick={() => setScreen({ kind: "endless" })}>
                Endless Mode
              </GameButton>
              <GameButton block variant="secondary" onClick={() => setScreen({ kind: "calibrate" })}>
                Calibrate Audio
              </GameButton>
              <GameButton block variant="secondary" onClick={() => setScreen({ kind: "leaderboard" })}>
                Leaderboard
              </GameButton>
            </div>
            <p className="song-composer">Today&rsquo;s daily song: {dailyTrackAt(openedAt).title}</p>
          </div>
        );

      case "songs":
        return (
          <>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={menu}>
                Back to menu
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
            onExit={() => setScreen(screen.daily ? { kind: "menu" } : { kind: "songs" })}
            onFinish={(result) => recordSongResult(screen.track, result, screen.daily)}
          />
        );

      case "daily-done":
        return (
          <div className="cascade-panel">
            <p className="song-composer">Daily Challenge · already played today</p>
            <h1 className="song-heading">{screen.track.title}</h1>
            <p className="cascade-stars" aria-label={`${screen.saved.stars} of 3 stars`}>
              {starText(screen.saved.stars)}
            </p>
            <p>Score {screen.saved.score}. Come back tomorrow for the next song.</p>
            <div className="cascade-actions">
              <GameButton variant="ghost" size="sm" onClick={menu}>
                Back to menu
              </GameButton>
            </div>
          </div>
        );

      case "endless":
        return <CascadeKeys track={null} onExit={menu} onEndlessQuit={(score) => recordEndlessResult(score)} />;

      case "calibrate":
        return <LatencyCalibration onExit={menu} />;

      case "leaderboard":
        return <Leaderboard onExit={menu} />;
    }
  }

  return <GameShell>{body()}</GameShell>;
}
