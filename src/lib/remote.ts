export type RemoteAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

/** Teclas habituales del navegador y códigos de retorno de webOS/Tizen. */
export function remoteAction(event: { key: string; keyCode: number }): RemoteAction | null {
  switch (event.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'Enter': case 'Select': case ' ': return 'confirm';
    case 'Escape': case 'Backspace': case 'BrowserBack': case 'GoBack': case 'Back': return 'back';
  }
  switch (event.keyCode) {
    case 37: return 'left';
    case 38: return 'up';
    case 39: return 'right';
    case 40: return 'down';
    case 13: return 'confirm';
    case 8: case 27: case 461: case 10009: return 'back';
    default: return null;
  }
}

/** Vecino en la dirección visual, incluso cuando la lista cambia a una columna. */
export function directionalNeighbor(
  current: HTMLElement,
  candidates: HTMLElement[],
  direction: 'up' | 'down' | 'left' | 'right',
): HTMLElement | undefined {
  const from = current.getBoundingClientRect();
  const vertical = direction === 'up' || direction === 'down';
  const forward = direction === 'down' || direction === 'right';
  const center = vertical ? (from.top + from.bottom) / 2 : (from.left + from.right) / 2;
  return candidates
    .filter((element) => element !== current)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const aligned = vertical
        ? Math.min(from.right, rect.right) - Math.max(from.left, rect.left) > 1
        : Math.min(from.bottom, rect.bottom) - Math.max(from.top, rect.top) > 1;
      const nextCenter = vertical ? (rect.top + rect.bottom) / 2 : (rect.left + rect.right) / 2;
      const distance = (nextCenter - center) * (forward ? 1 : -1);
      return { element, aligned, distance };
    })
    .filter(({ aligned, distance }) => aligned && distance > 1)
    .sort((a, b) => a.distance - b.distance)[0]?.element;
}
