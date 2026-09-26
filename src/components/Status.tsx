import type { RealtimeStatus } from '../hooks/useAttendanceFeed';
import { splitTime } from '../lib/time';

export function atTime(date: Date): string {
  const { main, suffix } = splitTime(date, true);
  return `${main.startsWith('1:') ? 'a la' : 'a las'} ${main} ${suffix}`.trim();
}

const LABELS: Record<RealtimeStatus, string> = {
  live: 'En vivo',
  connecting: 'Conectando',
  reconnecting: 'Reconectando',
  offline: 'Sin conexión',
};

export function ConnectionStatus({ status, lastUpdated, refreshing }: {
  status: RealtimeStatus; lastUpdated: Date | null; refreshing: boolean;
}) {
  return (
    <div className={`status status--${status}`} role="status" aria-live="polite">
      <span className="status__dot" aria-hidden="true" />
      <span className="status__text">
        <strong>{LABELS[status]}</strong>
        <span>
          {refreshing
            ? 'Actualizando…'
            : lastUpdated
              ? `Actualizado ${atTime(lastUpdated)}`
              : 'Sin datos todavía'}
        </span>
      </span>
    </div>
  );
}
