import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { AppError, toAppError } from '../lib/errors';
import {
  fetchAttendancePage, fetchDayCounts, fetchProfiles, findProfilesByName, isAttendance,
  PAGE_SIZE, type Attendance, type DayCounts,
} from '../lib/queries';
import { client } from '../lib/supabase';
import { dayRangeUtc, isInRange, type DayKey } from '../lib/time';

export type FeedParams = { day: DayKey; search: string; page: number };
export type FeedRow = Attendance & { full_name: string | null };
export type RealtimeStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

const RELOAD_DELAY_MS = 400;
const RESUBSCRIBE_DELAY_MS = 5000;
let channelSequence = 0;

const keyOf = (p: FeedParams) => `${p.day}|${p.search.trim().toLowerCase()}|${p.page}`;
const newestFirst = (a: Attendance, b: Attendance) =>
  b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);

/**
 * Datos del tablero: consulta inicial, paginación, búsqueda, conteos del día y
 * cambios en tiempo real. Tras cada evento o reconexión vuelve a leer la base,
 * así el tablero no depende solo de las notificaciones.
 */
export function useAttendanceFeed(params: FeedParams, onSessionExpired: () => void) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [counts, setCounts] = useState<DayCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStatus>('connecting');
  const [newOnFirstPage, setNewOnFirstPage] = useState(0);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const names = useRef(new Map<string, string | null>());
  const paramsRef = useRef(params);
  const loadedKey = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const inFlight = useRef(false);
  const dirty = useRef(false);
  const reloadTimer = useRef<number | undefined>(undefined);
  const expiredRef = useRef(onSessionExpired);

  useEffect(() => {
    paramsRef.current = params;
    expiredRef.current = onSessionExpired;
  });

  const resolveNames = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !names.current.has(id));
    if (missing.length === 0) return;
    const found = await fetchProfiles(missing);
    const byId = new Map(found.map((p) => [p.id, p.full_name]));
    for (const id of missing) names.current.set(id, byId.get(id) ?? null);
  }, []);

  const withName = useCallback((row: Attendance): FeedRow => (
    { ...row, full_name: names.current.get(row.user_id) ?? null }
  ), []);

  const load = useCallback(async () => {
    const p = paramsRef.current;
    const key = keyOf(p);
    const seq = ++loadSeq.current;
    inFlight.current = true;
    dirty.current = false;
    const sameView = loadedKey.current === key;
    if (sameView) setRefreshing(true);
    else setPhase('loading');

    try {
      const range = dayRangeUtc(p.day);
      const search = p.search.trim();
      let ids: string[] | null = null;
      let truncated = false;
      if (search) {
        const result = await findProfilesByName(search);
        truncated = result.truncated;
        ids = result.profiles.map((x) => x.id);
        for (const x of result.profiles) names.current.set(x.id, x.full_name);
      }
      const [dayCounts, page] = await Promise.all([
        fetchDayCounts(range),
        fetchAttendancePage(range, p.page, ids),
      ]);
      await resolveNames(page.rows.map((r) => r.user_id));
      if (seq !== loadSeq.current) return;

      setCounts(dayCounts);
      setTotal(page.total);
      setRows(page.rows.map(withName));
      setSearchTruncated(truncated);
      setError(null);
      setPhase('ready');
      setLastUpdated(new Date());
      if (p.page === 1) setNewOnFirstPage(0);
      loadedKey.current = key;
    } catch (err) {
      if (seq !== loadSeq.current) return;
      const appError = toAppError(err);
      if (appError.kind === 'session') {
        expiredRef.current();
        return;
      }
      setError(appError);
      // Si nunca se cargó esta vista, se muestra el error en lugar de datos
      // de otra fecha o búsqueda. Si ya había datos, se conservan con aviso.
      if (!sameView) setPhase('error');
    } finally {
      if (seq === loadSeq.current) {
        inFlight.current = false;
        setRefreshing(false);
        if (dirty.current) scheduleReloadRef.current();
      }
    }
  }, [resolveNames, withName]);

  const scheduleReload = useCallback(() => {
    if (inFlight.current) {
      dirty.current = true;
      return;
    }
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => void load(), RELOAD_DELAY_MS);
  }, [load]);

  const scheduleReloadRef = useRef(scheduleReload);
  useEffect(() => {
    scheduleReloadRef.current = scheduleReload;
  }, [scheduleReload]);

  // Nueva consulta al cambiar fecha, búsqueda o página.
  useEffect(() => {
    void load();
  }, [params.day, params.search, params.page, load]);

  const handleInsert = useCallback(async (value: unknown) => {
    if (!isAttendance(value)) return;
    const row = value;
    const p = paramsRef.current;
    if (!isInRange(row.created_at, dayRangeUtc(p.day))) return;

    try {
      await resolveNames([row.user_id]);
    } catch {
      // Sin nombre por ahora; la relectura posterior lo completará.
    }
    const name = names.current.get(row.user_id) ?? null;
    const search = p.search.trim().toLowerCase();
    const matches = !search || (name ?? '').toLowerCase().includes(search);

    if (matches) {
      if (p.page === 1) {
        setRows((prev) => {
          if (prev.some((r) => r.id === row.id)) return prev;
          return [{ ...row, full_name: name }, ...prev].sort(newestFirst).slice(0, PAGE_SIZE);
        });
        setHighlightId(row.id);
      } else {
        setNewOnFirstPage((n) => n + 1);
      }
    }
    // Conteos y total exactos desde la base (evita contar dos veces).
    scheduleReload();
  }, [resolveNames, scheduleReload]);

  const insertRef = useRef(handleInsert);
  useEffect(() => {
    insertRef.current = handleInsert;
  }, [handleInsert]);

  // Suscripción de Realtime: una por montaje del tablero.
  useEffect(() => {
    const supabase = client();
    let channel: RealtimeChannel | null = null;
    let retry: number | undefined;
    let disposed = false;
    let everLive = false;

    const connect = () => {
      if (disposed) return;
      window.clearTimeout(retry);
      if (channel) {
        const old = channel;
        channel = null;
        void supabase.removeChannel(old);
      }
      if (!navigator.onLine) {
        setRealtime('offline');
        return;
      }
      setRealtime(everLive ? 'reconnecting' : 'connecting');
      // El nombre del canal debe funcionar también por HTTP en la red local.
      const ch = supabase.channel(`attendance-feed-${Date.now()}-${++channelSequence}`);
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, (payload) => {
        void insertRef.current(payload.new);
      });
      channel = ch;
      ch.subscribe((status) => {
        if (disposed || channel !== ch) return;
        if (status === 'SUBSCRIBED') {
          everLive = true;
          window.clearTimeout(retry);
          setRealtime('live');
          // Recupera lo que pudo llegar mientras no había suscripción.
          scheduleReloadRef.current();
        } else {
          setRealtime(navigator.onLine ? 'reconnecting' : 'offline');
          window.clearTimeout(retry);
          retry = window.setTimeout(connect, RESUBSCRIBE_DELAY_MS);
        }
      });
    };

    const onOnline = () => {
      connect();
      scheduleReloadRef.current();
    };
    const onOffline = () => setRealtime('offline');
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleReloadRef.current();
      if (!channel || channel.state !== 'joined') connect();
    };

    connect();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.clearTimeout(retry);
      window.clearTimeout(reloadTimer.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      names.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const t = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(t);
  }, [highlightId]);

  const refresh = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    void load();
  }, [load]);

  return {
    rows, counts, total, phase, error, refreshing, lastUpdated, realtime,
    newOnFirstPage, searchTruncated, highlightId, refresh,
  };
}
