/**
 * A synthesised piano: additive sine partials with a struck-string envelope, and a
 * lookahead scheduler that turns queued notes into audio nodes just before they sound.
 * No sample files are loaded, so the voice works offline.
 */

/** How often the scheduler wakes up, in ms. */
export const LOOKAHEAD_MS = 25;

/** How far ahead of the audio clock notes are scheduled, in seconds. */
export const SCHEDULE_AHEAD_S = 0.1;

const ATTACK_S = 0.005;
const PEAK_GAIN = 0.3;
const SILENCE = 0.0001;

/** Harmonic ratio, relative loudness and relative decay for each partial of the voice. */
const PARTIALS = [
  { ratio: 1, gain: 0.6, decay: 1 },
  { ratio: 2, gain: 0.25, decay: 0.6 },
  { ratio: 3, gain: 0.1, decay: 0.35 },
  { ratio: 4, gain: 0.05, decay: 0.2 },
] as const;

/** The part of an AudioContext the piano uses. A fake of this shape is enough for tests. */
export interface PianoAudioContext {
  readonly currentTime: number;
  readonly destination: AudioNode;
  readonly state?: string;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  resume?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Schedule one piano note on the audio clock: one sine oscillator per partial, each
 * through its own gain envelope. Returns the oscillators so callers can inspect them.
 */
export function scheduleVoice(ctx: PianoAudioContext, freq: number, when: number, duration: number): OscillatorNode[] {
  const oscillators: OscillatorNode[] = [];
  for (const partial of PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peakAt = when + ATTACK_S;
    const endAt = peakAt + duration * partial.decay;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * partial.ratio, when);
    gain.gain.setValueAtTime(SILENCE, when);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * partial.gain, peakAt);
    gain.gain.exponentialRampToValueAtTime(SILENCE, endAt);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(endAt + 0.05);
    oscillators.push(osc);
  }
  return oscillators;
}

interface PendingNote {
  freq: number;
  duration: number;
  /** Audio-clock time, in seconds, at which the note should sound. */
  at: number;
}

/**
 * Plays notes through a lookahead scheduler. `playNote` only queues; the timer (every
 * LOOKAHEAD_MS) sends each note that starts within SCHEDULE_AHEAD_S to the audio clock,
 * so playback timing comes from the audio clock and not from the frame rate.
 */
export class PianoEngine {
  private ctx: PianoAudioContext | null = null;
  private pending: PendingNote[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private isMuted = true;

  constructor(private readonly createContext: () => PianoAudioContext = () => new AudioContext()) {}

  /** Muted by default, as the platform requires. Muting drops anything still queued. */
  get muted(): boolean {
    return this.isMuted;
  }

  set muted(value: boolean) {
    this.setMuted(value);
  }

  /** Same as the `muted` setter, for callers that prefer a method. */
  setMuted(value: boolean): void {
    this.isMuted = value;
    if (value) this.pending = [];
  }

  /**
   * Queue a note to sound at audio-clock time `at` (defaults to now). Does nothing
   * while muted or before start(), so a muted game never schedules audio.
   */
  playNote(freq: number, duration: number, at?: number): void {
    if (this.isMuted || !this.ctx) return;
    this.pending.push({ freq, duration, at: at ?? this.ctx.currentTime });
  }

  /** Sound every queued note that starts within the schedule-ahead window. */
  tick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;
    this.pending = this.pending.filter((note) => {
      if (note.at >= horizon) return true;
      scheduleVoice(ctx, note.freq, Math.max(note.at, ctx.currentTime), note.duration);
      return false;
    });
  }

  /** Create the audio context and start the scheduler. Call it from a user gesture. */
  start(): void {
    if (!this.ctx) this.ctx = this.createContext();
    void this.ctx.resume?.().catch(() => {});
    if (this.timer === null) this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  /** Stop the scheduler, drop queued notes and release the audio context. */
  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.pending = [];
    void this.ctx?.close?.().catch(() => {});
    this.ctx = null;
  }
}
