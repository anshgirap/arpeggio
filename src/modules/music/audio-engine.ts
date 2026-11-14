import type { PianoNote } from "./piano";

type PianoVoice = {
  oscillator: OscillatorNode;
  gain: GainNode;
  group: "phrase" | "manual";
};

/** A small shared Web Audio engine for the ARPEGGIO piano. */
export class PianoAudioEngine {
  private context: AudioContext | null = null;
  private readonly voices = new Set<PianoVoice>();
  private revision = 0;

  get playbackRevision(): number {
    return this.revision;
  }

  private getContext(): AudioContext {
    if (typeof window === "undefined" || !window.AudioContext) {
      throw new Error("Audio playback is not supported in this browser.");
    }

    if (!this.context || this.context.state === "closed") {
      this.context = new window.AudioContext({ latencyHint: "interactive" });
    }

    return this.context;
  }

  /** Try once during page startup without waiting for an autoplay-blocked resume. */
  async tryAutoplay(): Promise<boolean> {
    let context: AudioContext;
    try {
      context = this.getContext();
    } catch {
      return false;
    }

    if (context.state === "running") return true;

    try {
      const resumeAttempt = context.resume().catch(() => undefined);
      await Promise.race([
        resumeAttempt,
        new Promise<void>((resolve) => window.setTimeout(resolve, 240)),
      ]);
    } catch {
      return false;
    }

    return this.isRunning(context);
  }

  /** Resume audio in direct response to a real user gesture. */
  async enable(): Promise<void> {
    const context = this.getContext();
    if (context.state !== "running") await context.resume();
    if (!this.isRunning(context)) throw new Error("Audio could not be started.");
  }

  private isRunning(context: AudioContext): boolean {
    return context.state === "running";
  }

  play(note: PianoNote, duration = 0.46, group: PianoVoice["group"] = "manual", revision = this.revision): boolean {
    const context = this.context;
    if (!context || context.state !== "running" || revision !== this.revision) return false;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      const attack = 0.012;
      const release = 0.035;
      const end = start + Math.max(duration, attack + release);
      const voice = { oscillator, gain, group };

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + attack);
      gain.gain.setValueAtTime(0.14, end - release);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        this.voices.delete(voice);
        oscillator.disconnect();
        gain.disconnect();
      };
      this.voices.add(voice);
      oscillator.start(start);
      oscillator.stop(end + 0.005);
      return true;
    } catch {
      return false;
    }
  }

  stopAll(): void {
    this.revision += 1;
    this.stopVoices();
  }

  stopVoices(group?: PianoVoice["group"]): void {
    const context = this.context;
    if (!context || context.state === "closed") return;

    const now = context.currentTime;
    const release = 0.012;
    for (const { oscillator, gain, group: voiceGroup } of this.voices) {
      if (group && voiceGroup !== group) continue;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.linearRampToValueAtTime(0, now + release);
        oscillator.stop(now + release + 0.005);
      } catch {
        // A voice may have naturally ended between the set iteration and stop.
      }
    }
  }

  async dispose(): Promise<void> {
    this.stopAll();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") await context.close();
  }
}
