export class VoiceManager {
  private current: HTMLAudioElement | null = null;
  private playToken = 0;

  play(source: string): void {
    this.stop();
    const token = ++this.playToken;
    const audio = new Audio(source);
    audio.preload = 'auto';
    this.current = audio;
    audio.addEventListener('ended', () => {
      if (this.playToken === token) this.current = null;
    }, { once: true });
    audio.addEventListener('error', () => {
      if (this.playToken === token) this.current = null;
    }, { once: true });
    void audio.play().catch(() => {
      if (this.playToken === token) this.current = null;
    });
  }

  stop(): void {
    this.playToken += 1;
    if (!this.current) return;
    this.current.pause();
    this.current.currentTime = 0;
    this.current.src = '';
    this.current = null;
  }

  destroy(): void {
    this.stop();
  }
}
