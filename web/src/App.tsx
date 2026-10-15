import { GameShell } from "./GameShell";
import { tracks } from "./data/tracks";

export default function App() {
  return (
    <GameShell>
      <h1 className="song-heading">Choose a song</h1>
      <ul className="song-list">
        {tracks.map((track) => (
          <li key={track.id} className="song-row">
            <span className="song-title">{track.title}</span>
            <span className="song-composer">{track.composer}</span>
          </li>
        ))}
      </ul>
    </GameShell>
  );
}
