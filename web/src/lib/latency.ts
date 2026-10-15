import { readJson, type KeyValueStore, writeJson } from "./storage";

export const LATENCY_KEY = "cascadeKeys.latencyOffset";
/** Offsets past this in either direction are clamped. A wider reading means a bad calibration. */
export const MAX_OFFSET_MS = 250;
/** The calibration metronome's beat interval, in ms (100 BPM). */
export const CALIBRATION_BEAT_MS = 600;
/** Beats in a calibration run. */
export const CALIBRATION_BEATS = 12;
/** The first beats are warm-up and are not measured. */
export const CALIBRATION_WARMUP_BEATS = 2;

/** Keep an offset in range and whole, so a stored value is always a usable number. */
export function clampOffset(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.round(Math.min(MAX_OFFSET_MS, Math.max(-MAX_OFFSET_MS, ms)));
}

/** The saved audio/visual offset, or 0 when calibration has never been run. */
export function loadLatencyOffset(store: KeyValueStore | null): number {
  const raw = readJson<unknown>(store, LATENCY_KEY);
  return typeof raw === "number" ? clampOffset(raw) : 0;
}

export function saveLatencyOffset(store: KeyValueStore | null, ms: number): void {
  writeJson(store, LATENCY_KEY, clampOffset(ms));
}

/** Remove the saved offset, so the game goes back to 0. */
export function resetLatencyOffset(store: KeyValueStore | null): void {
  store?.removeItem(LATENCY_KEY);
}

/** The times of `count` beats, starting at `startMs` and spaced `intervalMs` apart. */
export function beatTimes(startMs: number, count: number, intervalMs = CALIBRATION_BEAT_MS): number[] {
  return Array.from({ length: count }, (_, i) => startMs + i * intervalMs);
}

/**
 * The mean offset of taps from their nearest beat, in ms. Positive means the player tapped
 * late. A tap more than half a beat from every beat is not counted. Null when nothing counts.
 */
export function calibrationOffset(taps: number[], beats: number[], intervalMs = CALIBRATION_BEAT_MS): number | null {
  const offsets: number[] = [];
  for (const tap of taps) {
    let nearest = Infinity;
    for (const beat of beats) {
      const diff = tap - beat;
      if (Math.abs(diff) < Math.abs(nearest)) nearest = diff;
    }
    if (Math.abs(nearest) <= intervalMs / 2) offsets.push(nearest);
  }
  if (offsets.length === 0) return null;
  return Math.round(offsets.reduce((sum, value) => sum + value, 0) / offsets.length);
}
