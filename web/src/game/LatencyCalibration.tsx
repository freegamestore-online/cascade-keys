import { type PointerEvent, useEffect, useRef, useState } from "react";
import { GameButton, useSound } from "@freegamestore/games";
import { PianoEngine } from "../engine/piano";
import { useGameLoop } from "../hooks/useGameLoop";
import {
  beatTimes,
  CALIBRATION_BEAT_MS,
  CALIBRATION_BEATS,
  CALIBRATION_WARMUP_BEATS,
  calibrationOffset,
  loadLatencyOffset,
  resetLatencyOffset,
  saveLatencyOffset,
} from "../lib/latency";
import { defaultStore } from "../lib/storage";

/** Time before the first click, so the player can get ready, in ms. */
const LEAD_IN_MS = 1500;
const CLICK_HZ = 880;
const CLICK_SECONDS = 0.06;

type Phase = "ready" | "running" | "done";

function formatOffset(ms: number): string {
  if (ms === 0) return "0 ms";
  return `${ms > 0 ? "+" : "−"}${Math.abs(ms)} ms`;
}

/**
 * Measure the audio/visual offset. A metronome clicks at 100 BPM and the player taps in time.
 * The mean gap between taps and beats is saved, and game judgements shift by it.
 */
export function LatencyCalibration({ onExit }: { onExit: () => void }) {
  const { muted } = useSound();
  const [piano] = useState(() => new PianoEngine());
  const [phase, setPhase] = useState<Phase>("ready");
  const [offset, setOffset] = useState(() => loadLatencyOffset(defaultStore()));
  const [measured, setMeasured] = useState<number | null>(null);
  const [beatCount, setBeatCount] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const beatsRef = useRef<number[]>([]);
  const nextBeatRef = useRef(0);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    piano.setMuted(muted);
  }, [piano, muted]);

  useEffect(() => () => piano.stop(), [piano]);

  // Click and count each beat as its time comes, then measure once the last beat has passed.
  useGameLoop(() => {
    if (phase !== "running") return;
    const beats = beatsRef.current;
    const now = performance.now();
    while (nextBeatRef.current < beats.length && now >= (beats[nextBeatRef.current] ?? Infinity)) {
      piano.playNote(CLICK_HZ, CLICK_SECONDS);
      nextBeatRef.current += 1;
      setBeatCount(nextBeatRef.current);
    }

    const last = beats.at(-1) ?? 0;
    if (now < last + CALIBRATION_BEAT_MS / 2) return;
    const countedFrom = (beats[CALIBRATION_WARMUP_BEATS] ?? 0) - CALIBRATION_BEAT_MS / 2;
    const taps = tapsRef.current.filter((tap) => tap >= countedFrom);
    const result = calibrationOffset(taps, beats.slice(CALIBRATION_WARMUP_BEATS));
    if (result !== null) {
      saveLatencyOffset(defaultStore(), result);
      setOffset(loadLatencyOffset(defaultStore()));
    }
    setMeasured(result);
    setPhase("done");
  });

  function start() {
    // Starting the piano is a user gesture, which browsers need before audio can play.
    piano.start();
    beatsRef.current = beatTimes(performance.now() + LEAD_IN_MS, CALIBRATION_BEATS);
    nextBeatRef.current = 0;
    tapsRef.current = [];
    setBeatCount(0);
    setTapCount(0);
    setMeasured(null);
    setPhase("running");
  }

  function onTap(_event: PointerEvent<HTMLDivElement>) {
    if (phase !== "running") return;
    tapsRef.current.push(performance.now());
    setTapCount((count) => count + 1);
  }

  function reset() {
    resetLatencyOffset(defaultStore());
    setOffset(0);
    setMeasured(null);
  }

  return (
    <div className="cascade">
      <div className="cascade-panel">
        <h1 className="song-heading">Calibrate audio</h1>
        <p>
          Tap in time with the click. Your offset is the average gap between your taps and the beat, and the
          game uses it to judge your taps.
        </p>
        <p className="cascade-verdict" aria-live="polite">
          Saved offset: {formatOffset(offset)}
        </p>

        {phase === "running" && (
          <>
            <div className="cascade-beat" aria-hidden="true">
              <span key={beatCount} className="cascade-beat-dot" />
            </div>
            <div
              className="cascade-tap"
              role="button"
              tabIndex={0}
              aria-label="Tap in time with the click"
              onPointerDown={onTap}
            >
              Tap · {tapCount}
            </div>
          </>
        )}

        {phase === "done" && (
          <p role="status">
            {measured === null
              ? "No taps counted. Try again, tapping on the beat."
              : `Saved ${formatOffset(measured)}.`}
          </p>
        )}

        <div className="cascade-actions">
          {phase !== "running" && (
            <GameButton onClick={start}>{phase === "done" ? "Run again" : "Start"}</GameButton>
          )}
          <GameButton variant="secondary" onClick={reset}>
            Reset
          </GameButton>
          <GameButton variant="ghost" size="sm" onClick={onExit}>
            Back
          </GameButton>
        </div>
      </div>
    </div>
  );
}
