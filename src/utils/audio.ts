// Clean, high-performance Web Audio API sound generator for Xeroxic notifications
// Pre-warmed audio context eliminates browser autoplay latency and delivers instant audio

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private isPrewarmed: boolean = false;

  constructor() {
    try {
      const stored = localStorage.getItem('xeroxic_sound_enabled');
      if (stored !== null) {
        this.soundEnabled = stored === 'true';
      }
    } catch {
      this.soundEnabled = true;
    }

    // Auto-prewarm AudioContext on first user interaction anywhere in the window
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        this.isPrewarmed = true;
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
      window.addEventListener('click', unlockAudio, { passive: true, once: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      console.warn('AudioContext not available:', e);
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('xeroxic_sound_enabled', String(enabled));
    } catch {}
  }

  private lastBellTime: number = 0;

  /**
   * Instant Ding-Dong Shop Bell for Xerox Operator Desk
   * Fast attack, zero latency, clear two-tone chime
   */
  public playNewOrderBell(): void {
    if (!this.soundEnabled) return;
    const currentTimeMs = Date.now();
    if (currentTimeMs - this.lastBellTime < 800) return; // Prevent double ringing
    this.lastBellTime = currentTimeMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. "DING" (High resonant strike - 987.77 Hz B5 + 1318.5 Hz E6 harmonic)
      const osc1 = ctx.createOscillator();
      const osc1Harmonic = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.6);

      osc1Harmonic.type = 'triangle';
      osc1Harmonic.frequency.setValueAtTime(1318.5, now);
      osc1Harmonic.frequency.exponentialRampToValueAtTime(1174.66, now + 0.5);

      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      osc1.connect(gain1);
      osc1Harmonic.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1Harmonic.start(now);
      osc1.stop(now + 0.7);
      osc1Harmonic.stop(now + 0.7);

      // 2. "DONG" (Deep counter chime - 783.99 Hz G5 + 523.25 Hz C5 resonance at +140ms)
      const dongTime = now + 0.14;
      const osc2 = ctx.createOscillator();
      const osc2Body = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, dongTime);
      osc2.frequency.exponentialRampToValueAtTime(659.25, dongTime + 0.9);

      osc2Body.type = 'triangle';
      osc2Body.frequency.setValueAtTime(523.25, dongTime);
      osc2Body.frequency.exponentialRampToValueAtTime(440, dongTime + 0.9);

      gain2.gain.setValueAtTime(0.45, dongTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, dongTime + 1.1);

      osc2.connect(gain2);
      osc2Body.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(dongTime);
      osc2Body.start(dongTime);
      osc2.stop(dongTime + 1.1);
      osc2Body.stop(dongTime + 1.1);
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  /**
   * Crisp uplifting chime when Razorpay payment succeeds
   */
  public playPaymentSuccessChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6 triumphant arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch (err) {
      console.warn('Payment success chime error:', err);
    }
  }

  /**
   * Notification chime for Student when print job is marked Ready for pickup
   */
  public playReadyChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch (err) {
      console.warn('Ready chime error:', err);
    }
  }
}

export const soundManager = new SoundManager();
