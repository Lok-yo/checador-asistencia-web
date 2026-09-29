import { memo, useMemo, useRef, type RefObject } from 'react';

import type { FeedRow } from '../hooks/useAttendanceFeed';
import { useRecordNavigation } from '../hooks/useRecordNavigation';
import { movementLabel } from '../lib/queries';
import { formatShortDate, splitTime } from '../lib/time';
import { EntryIcon, ExitIcon, PhotoIcon } from './Icons';

export const RecordList = memo(function RecordList({ rows, highlightId, onOpenPhoto, busy, screenMode = false, exitRef }: {
  rows: FeedRow[];
  highlightId: string | null;
  onOpenPhoto: (row: FeedRow) => void;
  busy: boolean;
  screenMode?: boolean;
  exitRef: RefObject<HTMLButtonElement | null>;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const navigation = useRecordNavigation(listRef, exitRef, screenMode, ids);
  return (
    <ol
      ref={listRef}
      className={`punches${screenMode ? ' punches--screen' : ''}${busy ? ' punches--busy' : ''}`}
      aria-busy={busy}
      aria-describedby={screenMode ? 'screen-navigation-help' : undefined}
    >
      {rows.map((row) => {
        const { main, suffix } = splitTime(new Date(row.created_at));
        const Icon = row.type === 'entry' ? EntryIcon : ExitIcon;
        const name = row.full_name ?? 'Perfil no disponible';
        const label = `Ver foto de ${name}, ${movementLabel(row.type).toLowerCase()} a las ${main} ${suffix}, ${formatShortDate(row.created_at)}`;
        const className = `punch punch--${row.type}${row.id === highlightId ? ' punch--new' : ''}`;
        const content = (
          <>
            <time className="punch__time" dateTime={row.created_at}>
              {main}<small>{suffix}</small>
            </time>
            <span className="punch__who">
              <strong className={row.full_name ? undefined : 'muted'}>{name}</strong>
              <span>{formatShortDate(row.created_at)}</span>
            </span>
            <span className={`tag tag--${row.type}`}>
              <Icon width={18} height={18} />
              {movementLabel(row.type)}
            </span>
          </>
        );
        if (screenMode) {
          return (
            <li key={row.id} data-id={row.id} className="screen-record">
              <button
                type="button"
                className={`${className} punch--selectable`}
                data-screen-record={row.id}
                tabIndex={navigation.selectedId === row.id ? 0 : -1}
                onFocus={() => navigation.onFocusRecord(row.id)}
                onClick={() => onOpenPhoto(row)}
                aria-label={label}
              >
                {content}
              </button>
            </li>
          );
        }
        return (
          <li key={row.id} data-id={row.id} className={className}>
            {content}
            <button
              type="button"
              className="btn btn--ghost punch__photo"
              onClick={() => onOpenPhoto(row)}
              aria-label={label}
            >
              <PhotoIcon /> <span>Ver foto</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
});

export function SkeletonList() {
  return (
    <ol className="punches punches--skeleton" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <li key={i} className="punch punch--ghost" />)}
    </ol>
  );
}
