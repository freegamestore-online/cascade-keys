import { useState } from "react";
import { GameButton } from "@freegamestore/games";
import { tracks } from "../data/tracks";
import { type LeaderboardRow, readLeaderboard } from "../lib/scores";
import { defaultStore } from "../lib/storage";

const KIND_LABEL: Record<LeaderboardRow["kind"], string> = {
  song: "Song",
  daily: "Daily",
  endless: "Endless",
};

function titleFor(songId: string): string {
  return tracks.find((track) => track.id === songId)?.title ?? songId;
}

/** Every saved result on this device, highest score first. Stored locally, since there is no server. */
export function Leaderboard({ onExit }: { onExit: () => void }) {
  const [rows] = useState(() => readLeaderboard(defaultStore(), titleFor));

  return (
    <div className="cascade">
      <div className="cascade-panel">
        <h1 className="song-heading">Leaderboard</h1>
        {rows.length === 0 ? (
          <p>No scores yet. Finish a song, the daily challenge, or an endless run to see it here.</p>
        ) : (
          <table className="leaderboard">
            <thead>
              <tr>
                <th scope="col">Song</th>
                <th scope="col">Score</th>
                <th scope="col">Stars</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.songId}-${row.date}`}>
                  <td>
                    {row.title}
                    <span className="leaderboard-kind"> · {KIND_LABEL[row.kind]}</span>
                  </td>
                  <td>{row.score}</td>
                  <td>{row.kind === "endless" ? "—" : "★".repeat(row.stars) + "☆".repeat(3 - row.stars)}</td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="cascade-actions">
          <GameButton variant="ghost" size="sm" onClick={onExit}>
            Back
          </GameButton>
        </div>
      </div>
    </div>
  );
}
