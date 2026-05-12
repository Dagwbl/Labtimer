/**
 * Sound & Vibration Service (Web Audio API)
 *
 * Provides notification alerts via synthesized tones and device vibration.
 *
 * Vibration only works on Chrome Android; silent fallback elsewhere.
 *
 * NOTE: AudioContext requires a user gesture (click/tap) before it can be
 * created or resumed — this is a browser autoplay policy restriction.
 */

type AudioContextConstructor = new () => AudioContext;

const AudioContextCtor = typeof window !== 'undefined'
  ? window.AudioContext
    || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  : null;

class SoundService {
  private audioCtx: AudioContext | null = null;

  async ensureAudioReady(): Promise<void> {
    if (!AudioContextCtor) return;
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextCtor();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Play a short "step complete" chime using the Web Audio API.
   * Creates the AudioContext lazily on first call.
   */
  async playStepComplete(): Promise<void> {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.9, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }

  /**
   * Trigger device vibration if the Vibration API is available.
   * Silent no-op on platforms that do not support navigator.vibrate.
   */
  async vibrate(): Promise<void> {
    if (navigator.vibrate) {
      navigator.vibrate(300);
    }
  }

  /**
   * Play the completion sound and vibrate in parallel.
   * Uses Promise.allSettled so a failure in one does not throw.
   */
  async notify(): Promise<void> {
    await this.ensureAudioReady();
    await Promise.allSettled([this.playStepComplete(), this.vibrate()]);
  }
}

export const soundService = new SoundService();
