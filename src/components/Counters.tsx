import type { DayCounts } from '../lib/queries';
import { EntryIcon, ExitIcon } from './Icons';

export function Counters({ counts, isToday, dayShort, failed }: {
  counts: DayCounts | null; isToday: boolean; dayShort: string; failed: boolean;
}) {
  const show = (n: number | undefined) => (failed || n === undefined ? '—' : n.toLocaleString('es-MX'));
  const suffix = isToday ? 'hoy' : `el ${dayShort}`;
  return (
    <div className="counters">
      <dl className="counter counter--entry">
        <dt><EntryIcon /> Entradas registradas {suffix}</dt>
        <dd>{show(counts?.entries)}</dd>
      </dl>
      <dl className="counter counter--exit">
        <dt><ExitIcon /> Salidas registradas {suffix}</dt>
        <dd>{show(counts?.exits)}</dd>
      </dl>
      <dl className="counter counter--total">
        <dt>Movimientos {isToday ? 'de hoy' : `del ${dayShort}`}</dt>
        <dd>{show(counts ? counts.entries + counts.exits : undefined)}</dd>
      </dl>
      <p className="counters__note">Cada checada cuenta como un movimiento; no indica cuántas personas están dentro.</p>
    </div>
  );
}
