import { memo } from 'react';

import type { FeedRow } from '../hooks/useAttendanceFeed';
import { movementLabel } from '../lib/queries';
import { formatShortDate, splitTime } from '../lib/time';
import { EntryIcon, ExitIcon, PhotoIcon } from './Icons';

export const RecordList = memo(function RecordList({ rows, highlightId, onOpenPhoto, busy }: {
  rows: FeedRow[];
  highlightId: string | null;
  onOpenPhoto: (row: FeedRow) => void;
  busy: boolean;
}) {
  return (
    <ol className={`punches${busy ? ' punches--busy' : ''}`} aria-busy={busy}>
      {rows.map((row) => {
        const { main, suffix } = splitTime(new Date(row.created_at));
        const Icon = row.type === 'entry' ? EntryIcon : ExitIcon;
        const name = row.full_name ?? 'Perfil no disponible';
        return (
          <li key={row.id} data-id={row.id} className={`punch punch--${row.type}${row.id === highlightId ? ' punch--new' : ''}`}>
            <time className="punch__time" dateTime={row.created_at}>
              {main}<small>{suffix}</small>
            </time>
            <div className="punch__who">
              <strong className={row.full_name ? undefined : 'muted'}>{name}</strong>
              <span>{formatShortDate(row.created_at)}</span>
            </div>
            <span className={`tag tag--${row.type}`}>
              <Icon width={18} height={18} />
              {movementLabel(row.type)}
            </span>
            <button
              type="button"
              className="btn btn--ghost punch__photo"
              onClick={() => onOpenPhoto(row)}
              aria-label={`Ver foto de ${name}, ${movementLabel(row.type).toLowerCase()} a las ${main} ${suffix}`}
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
