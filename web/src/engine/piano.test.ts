import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOOKAHEAD_MS, PianoEngine, type PianoAudioContext, scheduleVoice } from "./piano";

interface FakeOscillator {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

/** An audio context that records what the piano asks it to build. No sample buffers exist here. */
function fakeContext(currentTime = 0) {
  const oscillators: FakeOscillator[] = [];
  const close = vi.fn(() => Promise.resolve());
  const ctx = {
    currentTime,
    destination: {} as AudioNode,
    createOscillator: () => {
      const osc: FakeOscillator = {
        type: "",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc as unknown as OscillatorNode;
    },
    createGain: () =>
      ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }) as unknown as GainNode,
    resume: vi.fn(() => Promise.resolve()),
    close,
  };
  return { ctx: ctx as PianoAudioContext & { currentTime: number }, oscillators, close };
}

describe("scheduleVoice", () => {
  it("builds one oscillator per partial, tuned to the harmonics of the note", () => {
    const { ctx, oscillators } = fakeContext();
    const built = scheduleVoice(ctx, 440, 1, 0.5);

    expect(built).toHaveLength(4);
    expect(oscillators.map((osc) => osc.type)).toEqual(["sine", "sine", "sine", "sine"]);
    expect(oscillators.map((osc) => osc.frequency.setValueAtTime.mock.calls[0]?.[0])).toEqual([440, 880, 1320, 1760]);
  });

  it("starts each partial at the scheduled time and stops it after the decay", () => {
    const { ctx, oscillators } = fakeContext();
    scheduleVoice(ctx, 440, 2, 0.5);

    for (const osc of oscillators) {
      expect(osc.start).toHaveBeenCalledWith(2);
      expect(osc.stop.mock.calls[0]?.[0]).toBeGreaterThan(2);
    }
  });
});

describe("PianoEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is muted by default and plays nothing until started", () => {
    const { ctx, oscillators } = fakeContext();
    const engine = new PianoEngine(() => ctx);
    expect(engine.muted).toBe(true);

    engine.playNote(440, 0.3);
    engine.tick();
    expect(oscillators).toHaveLength(0);
  });

  it("schedules notes that start inside the lookahead window and holds back the rest", () => {
    const clock = fakeContext(0);
    const engine = new PianoEngine(() => clock.ctx);
    engine.muted = false;
    engine.start();

    engine.playNote(440, 0.3, 0.5);
    engine.tick();
    expect(clock.oscillators).toHaveLength(0);

    clock.ctx.currentTime = 0.45;
    engine.tick();
    expect(clock.oscillators).toHaveLength(4);
    expect(clock.oscillators[0]?.start).toHaveBeenCalledWith(0.5);
    engine.stop();
  });

  it("wakes on the lookahead timer, not only when tick is called", () => {
    const clock = fakeContext(0);
    const engine = new PianoEngine(() => clock.ctx);
    engine.muted = false;
    engine.start();

    engine.playNote(440, 0.3, 0.05);
    vi.advanceTimersByTime(LOOKAHEAD_MS);
    expect(clock.oscillators).toHaveLength(4);
    engine.stop();
  });

  it("suppresses scheduling while muted and drops anything already queued", () => {
    const clock = fakeContext(0);
    const engine = new PianoEngine(() => clock.ctx);
    engine.muted = false;
    engine.start();

    engine.playNote(440, 0.3, 0.05);
    engine.muted = true;
    engine.playNote(523, 0.3, 0.05);
    vi.advanceTimersByTime(LOOKAHEAD_MS * 4);

    expect(clock.oscillators).toHaveLength(0);
    engine.stop();
  });

  it("stop clears the timer, drops queued notes and closes the context", () => {
    const clock = fakeContext(0);
    const engine = new PianoEngine(() => clock.ctx);
    engine.muted = false;
    engine.start();
    engine.playNote(440, 0.3, 0.5);

    engine.stop();
    vi.advanceTimersByTime(LOOKAHEAD_MS * 40);

    expect(clock.oscillators).toHaveLength(0);
    expect(clock.close).toHaveBeenCalledTimes(1);
  });
});
