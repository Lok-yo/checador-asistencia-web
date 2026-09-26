import { toAppError } from './errors';
import { client } from './supabase';
import type { DayRange } from './time';

export type MovementType = 'entry' | 'exit';

/** Fila de public.attendance (misma forma que src/lib/format.ts de la app móvil). */
export type Attendance = {
  id: string;
  user_id: string;
  type: MovementType;
  photo_path: string;
  created_at: string;
  request_id: string;
};

export type Profile = { id: string; full_name: string };

export const PHOTO_BUCKET = 'attendance-photos';
export const PAGE_SIZE = 20;
/** Máximo de perfiles que puede abarcar una búsqueda por nombre. */
export const SEARCH_PROFILE_LIMIT = 200;

const ATTENDANCE_COLUMNS = 'id,user_id,type,photo_path,created_at,request_id';

export function movementLabel(type: MovementType): string {
  return type === 'entry' ? 'Entrada' : 'Salida';
}

/** true si la cuenta tiene fila en attendance_supervisors (la RLS solo deja ver la propia). */
export async function isSupervisor(userId: string): Promise<boolean> {
  const { data, error, status } = await client()
    .from('attendance_supervisors')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toAppError(error, status);
  return data !== null;
}

export async function fetchOwnName(userId: string): Promise<string | null> {
  const { data, error, status } = await client()
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toAppError(error, status);
  return (data as { full_name: string } | null)?.full_name ?? null;
}

export type DayCounts = { entries: number; exits: number };

/** Conteos exactos de TODO el día (no solo de la página visible). */
export async function fetchDayCounts(range: DayRange): Promise<DayCounts> {
  const count = async (type: MovementType) => {
    const { count: value, error, status } = await client()
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('type', type)
      .gte('created_at', range.start)
      .lt('created_at', range.end);
    if (error) throw toAppError(error, status);
    return value ?? 0;
  };
  const [entries, exits] = await Promise.all([count('entry'), count('exit')]);
  return { entries, exits };
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Perfiles cuyo nombre contiene el texto (sin distinguir mayúsculas). */
export async function findProfilesByName(search: string): Promise<{ profiles: Profile[]; truncated: boolean }> {
  const { data, error, status } = await client()
    .from('profiles')
    .select('id,full_name')
    .ilike('full_name', `%${escapeLike(search)}%`)
    .order('full_name')
    .limit(SEARCH_PROFILE_LIMIT + 1);
  if (error) throw toAppError(error, status);
  const rows = (data ?? []) as Profile[];
  return { profiles: rows.slice(0, SEARCH_PROFILE_LIMIT), truncated: rows.length > SEARCH_PROFILE_LIMIT };
}

export async function fetchAttendancePage(
  range: DayRange,
  page: number,
  userIds: string[] | null,
): Promise<{ rows: Attendance[]; total: number }> {
  if (userIds && userIds.length === 0) return { rows: [], total: 0 };
  const from = (page - 1) * PAGE_SIZE;
  let query = client()
    .from('attendance')
    .select(ATTENDANCE_COLUMNS, { count: 'exact' })
    .gte('created_at', range.start)
    .lt('created_at', range.end)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (userIds) query = query.in('user_id', userIds);
  const { data, error, count, status } = await query;
  // 416: se pidió una página que ya no existe (p. ej. cambió el total).
  if (error && status === 416) return { rows: [], total: count ?? 0 };
  if (error) throw toAppError(error, status);
  return { rows: (data ?? []) as Attendance[], total: count ?? 0 };
}

/** Consulta perfiles por id. No hay FK attendance→profiles, se combinan en el cliente. */
export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids)];
  const out: Profile[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { data, error, status } = await client().from('profiles').select('id,full_name').in('id', chunk);
    if (error) throw toAppError(error, status);
    out.push(...((data ?? []) as Profile[]));
  }
  return out;
}

export function isAttendance(value: unknown): value is Attendance {
  const v = value as Partial<Attendance> | null;
  return !!v && typeof v.id === 'string' && typeof v.user_id === 'string'
    && (v.type === 'entry' || v.type === 'exit') && typeof v.created_at === 'string'
    && typeof v.photo_path === 'string';
}
