import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { directionalNeighbor, remoteAction } from '../lib/remote';

function focusAndReveal(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function useRecordNavigation(
  listRef: RefObject<HTMLOListElement | null>,
  exitRef: RefObject<HTMLButtonElement | null>,
  enabled: boolean,
  recordIds: string[],
) {
  const selected = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onFocusRecord = useCallback((id: string | null) => {
    selected.current = id;
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const list = listRef.current;
    const first = list?.querySelector<HTMLButtonElement>('[data-screen-record]');
    focusAndReveal(first);
  }, [enabled, listRef]);

  useEffect(() => {
    if (!enabled) return;
    const list = listRef.current;
    if (recordIds.includes(selected.current ?? '')) {
      if (list?.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
        document.activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      return;
    }
    const first = list?.querySelector<HTMLButtonElement>('[data-screen-record]');
    onFocusRecord(first?.dataset.screenRecord ?? null);
    // Realtime puede desplazar fuera de la página el registro seleccionado.
    // No se cambia el foco mientras se está viendo su fotografía.
    if (!document.querySelector('dialog[open]')
      && (document.activeElement === document.body || list?.contains(document.activeElement))) {
      focusAndReveal(first);
    }
  }, [enabled, recordIds, listRef, onFocusRecord]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]')) return;
      const action = remoteAction(event);
      if (!action || action === 'back') return;
      const records = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-screen-record]') ?? []);
      const current = document.activeElement;
      if (current === exitRef.current) {
        event.preventDefault();
        if (action === 'down') {
          focusAndReveal(records.find((element) => element.dataset.screenRecord === selected.current) ?? records[0]);
        } else if (action === 'confirm' && !event.repeat) {
          exitRef.current?.click();
        }
        return;
      }
      if (!(current instanceof HTMLButtonElement) || !records.includes(current)) {
        if (current === document.body && records.length) {
          event.preventDefault();
          focusAndReveal(records[0]);
        }
        return;
      }
      event.preventDefault();
      if (action === 'confirm') {
        if (!event.repeat) current.click();
        return;
      }
      const next = directionalNeighbor(current, records, action);
      if (next) focusAndReveal(next);
      else if (action === 'up') focusAndReveal(exitRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, exitRef, listRef]);

  return { selectedId: selectedId ?? recordIds[0] ?? null, onFocusRecord };
}
