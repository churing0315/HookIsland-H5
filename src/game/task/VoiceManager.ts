export class VoiceManager {
  private readonly audio = new Audio();
  private prompt: string | null = null;
  private idleTimer: number | null = null;
  private finishGuide: ((result: GuideVoiceResult) => void) | null = null;

  play(source: string): void {
    this.stop();
    if (this.audio.getAttribute('src') !== source) this.audio.src = source;
    void this.audio.play().catch(() => undefined);
  }

  playGuide(source: string): Promise<GuideVoiceResult> {
    this.stopPrompt();
    const audio = this.audio;
    audio.src = source;
    return new Promise((resolve) => {
      const onReady = (): void => window.clearTimeout(loadTimeout);
      const onEnded = (): void => finish('ended');
      const onError = (): void => finish('failed');
      const loadTimeout = window.setTimeout(onError, 3_000);
      const playbackTimeout = window.setTimeout(onError, 12_000);
      const finish = (result: GuideVoiceResult): void => {
        if (this.finishGuide !== finish) return;
        this.finishGuide = null;
        window.clearTimeout(loadTimeout);
        window.clearTimeout(playbackTimeout);
        audio.removeEventListener('canplay', onReady);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        if (result !== 'ended') audio.pause();
        resolve(result);
      };
      this.finishGuide = finish;
      audio.addEventListener('canplay', onReady);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      if (audio.readyState >= 3) onReady();
      void audio.play().then(onReady, (error: unknown) => {
        finish(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'failed');
      });
    });
  }

  startPrompt(source: string): void {
    this.prompt = source;
    this.play(source);
    this.noteActivity();
  }

  noteActivity(): void {
    if (this.idleTimer !== null) window.clearTimeout(this.idleTimer);
    const prompt = this.prompt;
    this.idleTimer = prompt === null ? null : window.setTimeout(() => this.startPrompt(prompt), 10_000);
  }

  stopPrompt(): void {
    this.prompt = null;
    this.noteActivity();
    this.stop();
  }

  private stop(): void {
    this.finishGuide?.('cancelled');
    this.audio.pause();
    if (this.audio.currentTime !== 0) this.audio.currentTime = 0;
  }

  destroy(): void {
    this.stopPrompt();
  }
}

export type GuideVoiceResult = 'ended' | 'blocked' | 'failed' | 'cancelled';
