export class VoiceManager {
  private readonly audio = new Audio();
  private prompt: string | null = null;
  private idleTimer: number | null = null;

  play(source: string): void {
    this.stop();
    if (this.audio.getAttribute('src') !== source) this.audio.src = source;
    void this.audio.play().catch(() => undefined);
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
    this.audio.pause();
    if (this.audio.currentTime !== 0) this.audio.currentTime = 0;
  }

  destroy(): void {
    this.stopPrompt();
  }
}
