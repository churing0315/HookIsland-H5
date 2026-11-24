export function bindPressFeedback(element: HTMLElement, visual: HTMLElement = element): () => void {
  let reboundTimer: number | null = null;
  const press = (): void => {
    if (reboundTimer !== null) window.clearTimeout(reboundTimer);
    visual.classList.remove('is-rebounding');
    visual.classList.add('is-pressed');
  };
  const release = (): void => {
    visual.classList.remove('is-pressed');
    visual.classList.add('is-rebounding');
    reboundTimer = window.setTimeout(() => visual.classList.remove('is-rebounding'), 220);
  };
  element.addEventListener('pointerdown', press);
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
  element.addEventListener('pointerleave', release);
  return () => {
    if (reboundTimer !== null) window.clearTimeout(reboundTimer);
    element.removeEventListener('pointerdown', press);
    element.removeEventListener('pointerup', release);
    element.removeEventListener('pointercancel', release);
    element.removeEventListener('pointerleave', release);
  };
}
