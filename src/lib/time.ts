import { configResult, DEFAULT_TIME_ZONE } from './config';

export const TIME_ZONE = configResult.ok ? configResult.config.timeZone : DEFAULT_TIME_ZONE;

/** Fecha de calendario sin hora, en formato YYYY-MM-DD. */
export type DayKey = string;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsIn(date: Date, zone: string): Parts {
  let fmt = partsFormatters.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatters.set(zone, fmt);
  }
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year, month: out.month, day: out.day,
    hour: out.hour === 24 ? 0 : out.hour, minute: out.minute, second: out.second,
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function offsetMs(instant: number, zone: string): number {
  const whole = Math.floor(instant / 1000) * 1000;
  const p = partsIn(new Date(whole), zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
}

function parseDay(day: DayKey): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error(`Fecha inválida: ${day}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Instante UTC en que empieza (00:00) el día indicado dentro de la zona. */
export function startOfDayUtc(day: DayKey, zone = TIME_ZONE): Date {
  const [y, m, d] = parseDay(day);
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  let instant = wallAsUtc - offsetMs(wallAsUtc, zone);
  // Segundo ajuste por si el primer cálculo cruzó un cambio de horario.
  const corrected = wallAsUtc - offsetMs(instant, zone);
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

export function addDays(day: DayKey, amount: number): DayKey {
  const [y, m, d] = parseDay(day);
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10);
}

export type DayRange = { start: string; end: string };

/** Rango semiabierto [inicio, fin) en UTC para consultar Supabase. */
export function dayRangeUtc(day: DayKey, zone = TIME_ZONE): DayRange {
  return {
    start: startOfDayUtc(day, zone).toISOString(),
    end: startOfDayUtc(addDays(day, 1), zone).toISOString(),
  };
}

export function dayKeyOf(date: Date, zone = TIME_ZONE): DayKey {
  const p = partsIn(date, zone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function todayKey(zone = TIME_ZONE): DayKey {
  return dayKeyOf(new Date(), zone);
}

export function isInRange(iso: string, range: DayRange): boolean {
  const t = Date.parse(iso);
  return t >= Date.parse(range.start) && t < Date.parse(range.end);
}

const timeFmt = new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const timeWithSecondsFmt = new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' });
const shortDateFmt = new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, dateStyle: 'long', timeStyle: 'medium' });

function clean(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ');
}

/** Separa "2:05 p.m." en { main: "2:05", suffix: "p.m." }. */
export function splitTime(date: Date, withSeconds = false): { main: string; suffix: string } {
  const text = clean((withSeconds ? timeWithSecondsFmt : timeFmt).format(date));
  const m = /^([\d:]+)\s*(.*)$/.exec(text);
  return m ? { main: m[1], suffix: m[2] } : { main: text, suffix: '' };
}

export function formatTime(iso: string): string {
  return clean(timeFmt.format(new Date(iso)));
}

export function formatShortDate(iso: string): string {
  return clean(shortDateFmt.format(new Date(iso)));
}

export function formatFull(value: string | Date): string {
  return clean(fullFmt.format(typeof value === 'string' ? new Date(value) : value));
}

/** Fecha larga de un día de calendario ("jueves, 25 de septiembre de 2026"). */
export function formatDayLong(day: DayKey): string {
  const noon = new Date(startOfDayUtc(day).getTime() + 12 * 3600 * 1000);
  return clean(longDateFmt.format(noon));
}

export function formatNowLong(date: Date): string {
  return clean(longDateFmt.format(date));
}
