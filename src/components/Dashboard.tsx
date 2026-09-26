import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAttendanceFeed, type FeedRow } from '../hooks/useAttendanceFeed';
import { useScreenMode } from '../hooks/useScreenMode';
import { PAGE_SIZE, SEARCH_PROFILE_LIMIT } from '../lib/queries';
import { addDays, formatDayLong, formatShortDate, isDayKey, startOfDayUtc, todayKey, type DayKey } from '../lib/time';
import { Clock, useNow } from './Clock';
import { Counters } from './Counters';
import { ClockMark, LogoutIcon, RefreshIcon, ScreenIcon, SearchIcon } from './Icons';
import { PhotoDialog } from './PhotoDialog';
import { RecordList, SkeletonList } from './RecordList';
import { atTime, ConnectionStatus } from './Status';

export function Dashboard({ supervisorName, onSignOut, onSessionExpired }: {
  supervisorName: string;
  onSignOut: () => void;
  onSessionExpired: () => void;
}) {
  const [day, setDay] = useState<DayKey>(() => todayKey());
  const [followToday, setFollowToday] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [photo, setPhoto] = useState<FeedRow | null>(null);
  const screen = useScreenMode();

  // Cambio de día a medianoche: si se estaba viendo "hoy", se avanza solo.
  const minuteTick = useNow(30_000);
  const today = todayKey();
  useEffect(() => {
    if (followToday && day !== today) {
      setDay(today);
      setPage(1);
    }
  }, [minuteTick, today, followToday, day]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => ({ day, search, page }), [day, search, page]);
  const feed = useAttendanceFeed(params, onSessionExpired);
  const totalPages = Math.max(1, Math.ceil(feed.total / PAGE_SIZE));
  const isToday = day === today;
  const dayShort = formatShortDate(startOfDayUtc(day).toISOString()).replace(/ de \d{4}$| \d{4}$/, '');

  // Si el total bajó (por ejemplo, otra búsqueda), no quedarse en una página vacía.
  useEffect(() => {
    if (feed.phase === 'ready' && page > totalPages) setPage(totalPages);
  }, [feed.phase, page, totalPages]);

  const changeDay = (value: DayKey) => {
    if (!isDayKey(value)) return;
    setDay(value);
    setFollowToday(value === todayKey());
    setPage(1);
  };

  const enterScreen = () => {
    setPage(1);
    void screen.enter();
  };

  const closePhoto = useCallback(() => setPhoto(null), []);
  const searchRef = useRef<HTMLInputElement>(null);

  const first = feed.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, feed.total);

  let body: ReactNode;
  if (feed.phase === 'error' && feed.error) {
    body = (
      <div className={`notice notice--error notice--${feed.error.kind}`} role="alert">
        <h2>{feed.error.kind === 'setup' || feed.error.kind === 'forbidden' ? 'Falta un paso de configuración' : 'No se pudieron consultar las checadas'}</h2>
        <p>{feed.error.message}</p>
        {feed.error.detail && <p className="notice__detail">Detalle técnico: {feed.error.detail}</p>}
        <button type="button" className="btn" onClick={feed.refresh}>Reintentar</button>
      </div>
    );
  } else if (feed.phase === 'loading' && feed.rows.length === 0) {
    body = <SkeletonList />;
  } else if (feed.rows.length === 0 && feed.phase === 'ready') {
    body = (
      <div className="empty">
        {search ? (
          <p>No hay checadas de nombres que contengan “{search}” {isToday ? 'hoy' : `el ${formatDayLong(day)}`}.</p>
        ) : isToday ? (
          <p>Todavía no hay checadas hoy. Aparecerán aquí en cuanto se registren desde la app móvil.</p>
        ) : (
          <p>No hay checadas registradas el {formatDayLong(day)}.</p>
        )}
      </div>
    );
  } else {
    body = (
      <RecordList
        rows={feed.rows}
        highlightId={feed.highlightId}
        onOpenPhoto={setPhoto}
        busy={feed.phase === 'loading'}
      />
    );
  }

  const filterSummary = [
    !isToday ? formatDayLong(day) : null,
    search ? `nombres con “${search}”` : null,
  ].filter(Boolean).join(', ');

  return (
    <div className={`dash${screen.active ? ' dash--screen' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <ClockMark aria-hidden="true" />
          <div>
            <h1>Checador de asistencia</h1>
            <p>Supervisor: {supervisorName}</p>
          </div>
        </div>
        <ConnectionStatus status={feed.realtime} lastUpdated={feed.lastUpdated} refreshing={feed.refreshing} />
        <nav className="actions" aria-label="Acciones del tablero">
          {screen.active ? (
            <button type="button" className="btn btn--light" onClick={() => void screen.exit()}>
              Salir de modo pantalla
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={feed.refresh} disabled={feed.refreshing}>
                <RefreshIcon /> Actualizar
              </button>
              <button type="button" className="btn" onClick={enterScreen}>
                <ScreenIcon /> Modo pantalla
              </button>
              <button type="button" className="btn btn--ghost" onClick={onSignOut}>
                <LogoutIcon /> Cerrar sesión
              </button>
            </>
          )}
        </nav>
      </header>

      <section className="summary" aria-label="Resumen del día">
        <Clock />
        <Counters counts={feed.counts} isToday={isToday} dayShort={dayShort} failed={feed.phase === 'error'} />
      </section>

      {!screen.active && (
        <section className="filters" aria-label="Filtros">
          <div className="field">
            <label htmlFor="filtro-fecha">Fecha</label>
            <div className="field__row">
              <button type="button" className="btn btn--ghost btn--small" onClick={() => changeDay(addDays(day, -1))} aria-label="Día anterior">‹</button>
              <input id="filtro-fecha" type="date" value={day} max={today} onChange={(e) => changeDay(e.target.value)} />
              <button type="button" className="btn btn--ghost btn--small" onClick={() => changeDay(addDays(day, 1))} disabled={day >= today} aria-label="Día siguiente">›</button>
              {!isToday && <button type="button" className="btn btn--small" onClick={() => changeDay(todayKey())}>Hoy</button>}
            </div>
          </div>
          <label className="field field--grow">
            <span>Buscar por nombre</span>
            <div className="search">
              <SearchIcon />
              <input
                ref={searchRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nombre o apellido"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </label>
        </section>
      )}

      <section className="feed" aria-labelledby="feed-title">
        <div className="feed__head">
          <h2 id="feed-title">
            {screen.active ? 'Checadas más recientes' : page === 1 && !search ? `Últimas ${PAGE_SIZE} checadas` : 'Checadas'}
            {!isToday || search ? <span className="feed__filter"> de {filterSummary}</span> : null}
          </h2>
          {feed.phase !== 'error' && feed.total > 0 && (
            <p className="feed__range">Mostrando {first}–{last} de {feed.total.toLocaleString('es-MX')}</p>
          )}
        </div>

        {feed.error && feed.phase === 'ready' && (
          <div className="notice notice--warn" role="alert">
            <p>
              No se pudo actualizar: {feed.error.message}
              {feed.lastUpdated ? ` Se muestran los datos obtenidos ${atTime(feed.lastUpdated)}.` : ''}
            </p>
            <button type="button" className="btn btn--small" onClick={feed.refresh}>Reintentar</button>
          </div>
        )}
        {feed.searchTruncated && (
          <p className="notice notice--info">
            La búsqueda coincide con más de {SEARCH_PROFILE_LIMIT} personas; solo se incluyen las primeras {SEARCH_PROFILE_LIMIT}. Escribe un nombre más completo.
          </p>
        )}
        {feed.newOnFirstPage > 0 && page > 1 && (
          <p className="notice notice--info">
            {feed.newOnFirstPage === 1 ? 'Llegó 1 checada nueva.' : `Llegaron ${feed.newOnFirstPage} checadas nuevas.`}{' '}
            <button type="button" className="link" onClick={() => setPage(1)}>Ver las más recientes</button>
          </p>
        )}

        {body}

        {!screen.active && totalPages > 1 && feed.phase !== 'error' && (
          <nav className="pager" aria-label="Páginas">
            <button type="button" className="btn btn--ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Más recientes
            </button>
            <span>Página {page} de {totalPages}</span>
            <button type="button" className="btn btn--ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Anteriores
            </button>
          </nav>
        )}
        {screen.active && filterSummary && (
          <p className="screen-filter">Filtro activo: {filterSummary}</p>
        )}
      </section>

      {photo && <PhotoDialog record={photo} onClose={closePhoto} onSessionExpired={onSessionExpired} />}
    </div>
  );
}
