export function clampCarouselPosition(position: number, count: number): number {
  return Math.max(0, Math.min(Math.max(0, count - 1), position));
}

export function cardTiltDegrees(relativePosition: number): number {
  const distance = Math.abs(relativePosition);
  if (distance < 0.0001) return 0;
  const magnitude = distance <= 1 ? distance * 3 : Math.min(5, 3 + (distance - 1) * 2);
  return Math.sign(relativePosition) * magnitude;
}

export function nearestCarouselIndex(position: number, count: number): number {
  return Math.round(clampCarouselPosition(position, count));
}

export function nextVisualSelectionIndex(position: number, currentIndex: number, count: number): number {
  const nearest = nearestCarouselIndex(position, count);
  if (nearest === currentIndex) return currentIndex;
  return Math.abs(position - currentIndex) >= 0.6 ? nearest : currentIndex;
}
