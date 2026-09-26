import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockLike = { release: () => Promise<void> };

/**
 * Modo pantalla: vista ampliada con pantalla completa cuando el navegador la
 * permite y bloqueo de suspensión de pantalla cuando existe la API.
 */
export function useScreenMode() {
  const [active, setActive] = useState(false);
  const usedFullscreen = useRef(false);
  const wakeLock = useRef<WakeLockLike | null>(null);

  const requestWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } };
    if (!nav.wakeLock || document.visibilityState !== 'visible') return;
    try {
      wakeLock.current = await nav.wakeLock.request('screen');
    } catch {
      wakeLock.current = null;
    }
  }, []);

  const enter = useCallback(async () => {
    setActive(true);
    usedFullscreen.current = false;
    const root = document.documentElement;
    if (document.fullscreenEnabled && !document.fullscreenElement && root.requestFullscreen) {
      try {
        await root.requestFullscreen({ navigationUI: 'hide' });
        usedFullscreen.current = true;
      } catch {
        // El navegador (o la TV) no lo permite: la vista ampliada sigue funcionando.
      }
    }
    void requestWakeLock();
  }, [requestWakeLock]);

  const exit = useCallback(async () => {
    setActive(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* sin efecto */ }
    }
    usedFullscreen.current = false;
    const lock = wakeLock.current;
    wakeLock.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onFullscreen = () => {
      // Si el usuario salió de pantalla completa (Esc), también sale del modo.
      if (usedFullscreen.current && !document.fullscreenElement) void exit();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) void exit();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, exit, requestWakeLock]);

  useEffect(() => () => {
    if (wakeLock.current) void wakeLock.current.release().catch(() => undefined);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  return { active, enter, exit };
}
