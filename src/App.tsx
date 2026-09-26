import { useCallback } from 'react';

import { configResult } from './lib/config';
import { Dashboard } from './components/Dashboard';
import { PwaNotices } from './components/PwaNotices';
import { AccessDenied, ConfigError, LoginScreen, SetupError, Splash } from './components/Screens';
import { SessionProvider, useSession } from './state/session';

function Gate() {
  const { state, signIn, signOut, expire, recheck } = useSession();
  const handleSignOut = useCallback(() => void signOut(), [signOut]);
  const handleExpired = useCallback(() => void expire(), [expire]);
  switch (state.status) {
    case 'loading':
      return <Splash text="Cargando…" />;
    case 'signedOut':
      return <LoginScreen reason={state.reason} onSubmit={signIn} />;
    case 'checking':
      return <Splash text="Comprobando permisos de supervisor…" />;
    case 'denied':
      return <AccessDenied session={state.session} onRecheck={recheck} onSignOut={handleSignOut} />;
    case 'error':
      return <SetupError error={state.error} onRecheck={recheck} onSignOut={handleSignOut} />;
    case 'ready':
      return (
        <Dashboard
          // Al cambiar de cuenta se desmonta todo: datos, fotos y canales.
          key={state.session.user.id}
          supervisorName={state.supervisorName}
          onSignOut={handleSignOut}
          onSessionExpired={handleExpired}
        />
      );
  }
}

export default function App() {
  return (
    <>
      {configResult.ok ? (
        <SessionProvider>
          <Gate />
        </SessionProvider>
      ) : (
        <ConfigError problems={configResult.problems} />
      )}
      <PwaNotices />
    </>
  );
}
