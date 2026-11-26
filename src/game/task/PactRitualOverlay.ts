const PACT_ASSET_ROOT = '/assets/pact';
const NORMAL_DURATION_MS = 2_600;
const REDUCED_DURATION_MS = 1_300;

interface PactRitualCallbacks {
  onComplete: () => void;
}

function shouldReduceMotion(): boolean {
  const query = new URLSearchParams(window.location.search);
  return query.get('reducedMotion') === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class PactRitualOverlay {
  private element: HTMLElement | null = null;
  private completionTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private completed = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: PactRitualCallbacks,
  ) {}

  mount(): void {
    if (this.element) return;
    const reducedMotion = shouldReduceMotion();
    const overlay = document.createElement('section');
    overlay.className = `pact-ritual${reducedMotion ? ' is-reduced-motion' : ''}`;
    overlay.setAttribute('aria-label', '拉钩约定正在生效');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="pact-ritual-stage" aria-hidden="true">
        <div class="pact-ritual-dim"></div>
        <div class="pact-ritual-dots">
          <span class="pact-ritual-dot pact-ritual-dot-upper"></span>
          <span class="pact-ritual-dot pact-ritual-dot-lower-small"></span>
          <span class="pact-ritual-dot pact-ritual-dot-lower-large"></span>
        </div>
        <div class="pact-ritual-emblem">
          <img class="pact-ritual-shape" src="${PACT_ASSET_ROOT}/pact_hand_shape.png" alt="">
          <div class="pact-ritual-mask">
            <div class="pact-ritual-light-fade">
              <img class="pact-ritual-light" src="${PACT_ASSET_ROOT}/pact_hand_light.png" alt="">
            </div>
            <div class="pact-hand-entry pact-hand-entry-right">
              <div class="pact-hand-tug pact-hand-tug-right">
                <img class="pact-hand pact-hand-right" src="${PACT_ASSET_ROOT}/pact_hand_right.png" alt="">
              </div>
            </div>
            <div class="pact-hand-entry pact-hand-entry-left">
              <div class="pact-hand-tug pact-hand-tug-left">
                <img class="pact-hand pact-hand-left" src="${PACT_ASSET_ROOT}/pact_hand_left.png" alt="">
              </div>
            </div>
            <img class="pact-emphasis pact-emphasis-01" src="${PACT_ASSET_ROOT}/pact_illust_01.png" alt="">
            <img class="pact-emphasis pact-emphasis-02" src="${PACT_ASSET_ROOT}/pact_illust_02.png" alt="">
            <img class="pact-emphasis pact-emphasis-03" src="${PACT_ASSET_ROOT}/pact_illust_03.png" alt="">
          </div>
        </div>
      </div>
    `;
    this.root.append(overlay);
    this.element = overlay;
    this.resizeObserver = new ResizeObserver(() => this.fitStage());
    this.resizeObserver.observe(this.root);
    this.fitStage();
    this.completionTimer = window.setTimeout(
      () => this.finish(),
      reducedMotion ? REDUCED_DURATION_MS : NORMAL_DURATION_MS,
    );
  }

  destroy(): void {
    if (this.completionTimer !== null) window.clearTimeout(this.completionTimer);
    this.completionTimer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.element?.remove();
    this.element = null;
  }

  private fitStage(): void {
    const stage = this.element?.querySelector<HTMLElement>('.pact-ritual-stage');
    if (!stage) return;
    const scale = Math.min(this.root.clientWidth / 812, this.root.clientHeight / 375);
    stage.style.setProperty('--pact-scale', String(scale));
  }

  private finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.completionTimer = null;
    this.callbacks.onComplete();
  }
}
