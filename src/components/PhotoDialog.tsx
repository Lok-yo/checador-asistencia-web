import { useCallback, useEffect, useRef, useState } from 'react';

import type { FeedRow } from '../hooks/useAttendanceFeed';
import { toAppError } from '../lib/errors';
import { movementLabel, PHOTO_BUCKET } from '../lib/queries';
import { client } from '../lib/supabase';
import { formatFull } from '../lib/time';
import { CloseIcon, EntryIcon, ExitIcon } from './Icons';

/** Duración de la URL firmada: solo lo necesario para descargar la imagen una vez. */
const SIGNED_URL_SECONDS = 60;

type PhotoState =
  | { status: 'loading' }
  | { status: 'ready'; objectUrl: string }
  | { status: 'error'; message: string };

export function PhotoDialog({ record, onClose, onSessionExpired }: {
  record: FeedRow;
  onClose: () => void;
  onSessionExpired: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<PhotoState>({ status: 'loading' });
  const objectUrl = useRef<string | null>(null);
  const attempt = useRef(0);
  const expiredRef = useRef(onSessionExpired);
  useEffect(() => {
    expiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const release = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  };

  const load = useCallback(async (signal: AbortSignal) => {
    const current = ++attempt.current;
    release();
    setState({ status: 'loading' });
    try {
      const { data, error } = await client().storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(record.photo_path, SIGNED_URL_SECONDS);
      if (error || !data?.signedUrl) {
        const e = error as { message?: string; statusCode?: string; status?: number } | null;
        const text = `${e?.message ?? ''}`;
        if (/not.?found/i.test(text) || String(e?.statusCode) === '404') {
          throw new Error('La fotografía no existe en el almacenamiento. Pudo borrarse o no terminar de subirse.');
        }
        const appError = toAppError(error ?? new Error('Sin URL firmada'));
        if (appError.kind === 'session') {
          expiredRef.current();
          return;
        }
        if (appError.kind === 'network') throw appError;
        throw new Error('Supabase no permitió abrir la fotografía. Comprueba que la política de Storage para supervisores esté aplicada.');
      }

      // no-store: la imagen no se guarda en la caché HTTP del navegador ni del service worker.
      const res = await fetch(data.signedUrl, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
      if (!res.ok) {
        throw new Error(res.status === 404
          ? 'La fotografía no existe en el almacenamiento.'
          : 'El enlace de la fotografía venció o fue rechazado. Vuelve a intentarlo.');
      }
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('El archivo guardado no es una imagen válida.');
      if (signal.aborted || current !== attempt.current) return;
      objectUrl.current = URL.createObjectURL(blob);
      setState({ status: 'ready', objectUrl: objectUrl.current });
    } catch (err) {
      if (signal.aborted || current !== attempt.current) return;
      const message = err instanceof Error && !(err instanceof TypeError)
        ? err.message
        : 'No se pudo descargar la fotografía. Revisa la conexión.';
      setState({ status: 'error', message });
    }
  }, [record.photo_path]);

  const controller = useRef<AbortController | null>(null);
  const start = useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    void load(controller.current.signal);
  }, [load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    start();
    return () => {
      controller.current?.abort();
      release();
    };
  }, [start]);

  const Icon = record.type === 'entry' ? EntryIcon : ExitIcon;

  return (
    <dialog
      ref={dialogRef}
      className="photo"
      aria-labelledby="photo-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="photo__panel">
        <header className="photo__head">
          <div>
            <h2 id="photo-title">{record.full_name ?? 'Perfil no disponible'}</h2>
            <p className={`tag tag--${record.type}`}>
              <Icon width={18} height={18} /> {movementLabel(record.type)}
            </p>
            <p className="photo__when">{formatFull(record.created_at)}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar fotografía">
            <CloseIcon />
          </button>
        </header>

        <div className="photo__frame">
          {state.status === 'loading' && <p className="photo__msg">Cargando fotografía…</p>}
          {state.status === 'error' && (
            <div className="photo__msg photo__msg--error">
              <p>{state.message}</p>
              <button type="button" className="btn" onClick={start}>Reintentar</button>
            </div>
          )}
          {state.status === 'ready' && (
            <img
              src={state.objectUrl}
              alt={`Selfie de ${record.full_name ?? 'la cuenta'} al registrar ${movementLabel(record.type).toLowerCase()}`}
              onError={() => setState({ status: 'error', message: 'La imagen está dañada o no se pudo mostrar.' })}
            />
          )}
        </div>
        <p className="photo__note">
          Selfie tomada en la app móvil como evidencia visual. Esta web no compara rostros.
        </p>
      </div>
    </dialog>
  );
}
