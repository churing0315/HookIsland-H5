export function bindPressFeedback(element: HTMLElement): () => void {
  let reboundTimer: number | null = null;
  const press = (): void => {
    if (reboundTimer !== null) window.clearTimeout(reboundTimer);
    element.classList.remove('is-rebounding');
    element.classList.add('is-pressed');
  };
  const release = (): void => {
    element.classList.remove('is-pressed');
    element.classList.add('is-rebounding');
    reboundTimer = window.setTimeout(() => element.classList.remove('is-rebounding'), 220);
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
