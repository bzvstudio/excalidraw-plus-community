export function fadeIn(element: HTMLElement | null): void {
  if (!element || typeof element.animate !== 'function') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' })
}
