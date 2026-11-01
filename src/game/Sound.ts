/** Крошечный синтезатор на WebAudio — без внешних файлов. */
export class Sound {
  enabled = true;
  private context: AudioContext | null = null;

  /** AudioContext можно создать только после жеста пользователя. */
  private acquire(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.context) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.context = new Ctor();
      }
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  unlock(): void {
    this.acquire();
  }

  private blip(
    type: OscillatorType,
    from: number,
    to: number,
    gain: number,
    duration: number,
  ): void {
    const ctx = this.acquire();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration * 0.85);

    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  boom(): void {
    this.blip('sawtooth', 150, 38, 0.16, 0.4);
  }

  build(): void {
    this.blip('triangle', 420, 700, 0.07, 0.09);
  }

  cash(): void {
    this.blip('sine', 880, 880, 0.035, 0.08);
  }
}
