import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function PwaNotices() {
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Busca versiones nuevas periódicamente (útil en una pantalla siempre encendida).
      window.setInterval(() => {
        if (navigator.onLine) void registration.update().catch(() => undefined);
      }, UPDATE_CHECK_MS);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 6000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  return (
    <div className="toasts" aria-live="polite">
      {!online && (
        <div className="toast toast--offline" role="alert">
          <strong>Sin conexión a internet.</strong> Los datos pueden no estar al día; se volverán a consultar al recuperar la conexión.
        </div>
      )}
      {needRefresh && (
        <div className="toast" role="alert">
          <span>Hay una versión nueva de la web.</span>
          <button type="button" className="btn btn--small btn--primary" onClick={() => void updateServiceWorker(true)}>Actualizar ahora</button>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setNeedRefresh(false)}>Después</button>
        </div>
      )}
      {offlineReady && (
        <div className="toast" role="status">
          La interfaz quedó lista para abrirse aunque falle la red. Las checadas siempre se consultan en línea.
        </div>
      )}
    </div>
  );
}
