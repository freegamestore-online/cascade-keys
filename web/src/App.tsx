import { useState } from "react";
import { GameShell } from "./GameShell";
import { CascadeKeys } from "./game/CascadeKeys";
import { tracks } from "./data/tracks";
import type { Track } from "./types";

export default function App() {
  const [track, setTrack] = useState<Track | null>(null);

  return (
    <GameShell>
      {track ? (
        <CascadeKeys key={track.id} track={track} onExit={() => setTrack(null)} />
      ) : (
        <>
          <h1 className="song-heading">Choose a song</h1>
          <ul className="song-list">
            {tracks.map((item) => (
              <li key={item.id}>
                <button type="button" className="song-row" onClick={() => setTrack(item)}>
                  <span className="song-title">{item.title}</span>
                  <span className="song-composer">{item.composer}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </GameShell>
  );
}
