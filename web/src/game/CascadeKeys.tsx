import { type PointerEvent, useEffect, useRef, useState } from "react";
import { GameButton, useSound } from "@freegamestore/games";
import { PianoEngine } from "../engine/piano";
import { useGameLoop } from "../hooks/useGameLoop";
import type { Lane, Track } from "../types";
import { GameEngine, LANE_FREQUENCIES, MAX_MISSES, type RunResult, START_SPEED } from "./GameEngine";
import { MISS_COLOUR, type Palette, Renderer } from "./Renderer";

const LANE_COUNT = 4;
const KEY_LANES: Record<string, Lane> = { d: 0, f: 1, j: 2, k: 3 };
/** How long a melody note rings when its tap lands, in seconds. */
const NOTE_SECONDS = 0.4;
/** Taps in the top share of the canvas are ignored, so the upper part is for watching the tiles fall. */
const TAP_TOP_SHARE = 0.5;

interface Hud {
  hits: number;
  misses: number;
  speed: number;
}

function stars(count: number): string {
  return "★".repeat(count) + "☆".repeat(3 - count);
}

/** The lane under a pointer, or null when the tap is above the hit zone. */
function laneAt(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>): Lane | null {
  const rect = canvas.getBoundingClientRect();
  if (event.clientY - rect.top < rect.height * TAP_TOP_SHARE) return null;
  const lane = Math.floor(((event.clientX - rect.left) / rect.width) * LANE_COUNT);
  return Math.min(LANE_COUNT - 1, Math.max(0, lane)) as Lane;
}

/** A correct press sounds the lane's melody note. A press that lands on nothing is silent. */
function strikeLane(engine: GameEngine, lane: Lane, piano: PianoEngine, renderer: Renderer): void {
  if (!engine.press(lane)) return;
  piano.playNote(LANE_FREQUENCIES[lane] ?? 0, NOTE_SECONDS);
  renderer.flash(lane);
}

function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  return {
    panel: style.getPropertyValue("--panel").trim() || "#f9fafb",
    line: style.getPropertyValue("--line").trim() || "#e5e7eb",
    muted: style.getPropertyValue("--muted").trim() || "#6b7280",
  };
}

/** One track played as a run: the canvas, the piano, the rules, and the star result. */
export function CascadeKeys({ track, onExit }: { track: Track; onExit: () => void }) {
  const { muted } = useSound();
  const [piano] = useState(() => new PianoEngine());
  const [renderer] = useState(() => new Renderer());
  const [game, setGame] = useState<GameEngine | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [hud, setHud] = useState<Hud>({ hits: 0, misses: 0, speed: START_SPEED });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerLanes = useRef(new Map<number, Lane>());

  useEffect(() => {
    piano.setMuted(muted);
  }, [piano, muted]);

  useEffect(() => () => piano.stop(), [piano]);

  // Hits and misses refresh the HUD. A miss flashes its lanes red, and the end of the run shows the result.
  useEffect(() => {
    if (!game) return;
    return game.subscribe((event) => {
      if (event.type === "end") {
        setResult(event.result);
        return;
      }
      if (event.type === "miss") event.tile.lanes.forEach((lane) => renderer.flash(lane, MISS_COLOUR));
      setHud({ hits: game.hits, misses: game.misses, speed: game.speed });
    });
  }, [game, renderer]);

  // The keyboard plays the lanes too: D F J K from left to right.
  useEffect(() => {
    if (!game) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const lane = KEY_LANES[event.key.toLowerCase()];
      if (lane === undefined || event.repeat) return;
      strikeLane(game, lane, piano, renderer);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const lane = KEY_LANES[event.key.toLowerCase()];
      if (lane !== undefined) game.release(lane);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [game, piano, renderer]);

  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dtMs = dt * 1000;
    game?.advance(dtMs);
    renderer.update(dtMs);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderer.draw(
      ctx,
      { tiles: game?.tiles ?? [], clock: game?.time ?? 0, speed: game?.speed ?? START_SPEED },
      rect.width,
      rect.height,
      readPalette(canvas),
    );
  });

  function startRun() {
    // Starting the piano is a user gesture, which browsers need before audio can play.
    piano.start();
    setResult(null);
    setHud({ hits: 0, misses: 0, speed: START_SPEED });
    setGame(new GameEngine(track.notes));
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const lane = laneAt(event.currentTarget, event);
    if (lane === null || !game) return;
    pointerLanes.current.set(event.pointerId, lane);
    strikeLane(game, lane, piano, renderer);
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const lane = pointerLanes.current.get(event.pointerId);
    if (lane === undefined) return;
    pointerLanes.current.delete(event.pointerId);
    game?.release(lane);
  }

  const playing = game !== null && result === null;

  return (
    <div className="cascade">
      <div className="cascade-hud" aria-live="polite">
        <span className="song-title">{track.title}</span>
        {game && (
          <span>
            Hits {hud.hits} · Misses {hud.misses}/{MAX_MISSES} · {Math.round(hud.speed)} px/s
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="cascade-canvas"
        role="application"
        aria-label={`${track.title}. Press D, F, J, K, or tap the lanes.`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {!game && (
        <div className="cascade-panel">
          <p className="cascade-composer">{track.composer}</p>
          <div className="cascade-actions">
            <GameButton onClick={startRun}>Play</GameButton>
            <GameButton variant="ghost" size="sm" onClick={onExit}>
              Back to songs
            </GameButton>
          </div>
        </div>
      )}

      {playing && (
        <div className="cascade-actions">
          <GameButton variant="ghost" size="sm" onClick={onExit}>
            Quit
          </GameButton>
        </div>
      )}

      {result && (
        <div className="cascade-panel" role="status">
          <p className="cascade-verdict">{result.status === "failed" ? "Run failed" : "Track cleared"}</p>
          <p className="cascade-stars" aria-label={`${result.stars} of 3 stars`}>
            {stars(result.stars)}
          </p>
          <p>
            {Math.round(result.accuracy * 100)}% accuracy · {result.hits} hit · {result.misses} missed
          </p>
          <div className="cascade-actions">
            <GameButton onClick={startRun}>Play again</GameButton>
            <GameButton variant="ghost" size="sm" onClick={onExit}>
              Back to songs
            </GameButton>
          </div>
        </div>
      )}
    </div>
  );
}
