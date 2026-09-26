import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';

import { AppError, toAppError } from '../lib/errors';
import { fetchOwnName, isSupervisor } from '../lib/queries';
import { client } from '../lib/supabase';

export type SignedOutReason = 'expired' | 'manual' | null;

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason: SignedOutReason }
  | { status: 'checking'; session: Session }
  | { status: 'denied'; session: Session }
  | { status: 'error'; session: Session; error: AppError }
  | { status: 'ready'; session: Session; supervisorName: string };

type SessionContextValue = {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Llamar cuando una consulta indica que el token ya no es válido. */
  expire: () => Promise<void>;
  recheck: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function loginMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(message)) return 'Confirma el correo de esta cuenta antes de iniciar sesión.';
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  if (/failed to fetch|network/i.test(message)) return 'No hay conexión con Supabase. Revisa la red.';
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const checkSeq = useRef(0);
  const currentUser = useRef<string | null>(null);
  const endingReason = useRef<SignedOutReason>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const verify = useCallback(async (session: Session) => {
    const seq = ++checkSeq.current;
    setState({ status: 'checking', session });
    try {
      const allowed = await isSupervisor(session.user.id);
      if (seq !== checkSeq.current) return;
      if (!allowed) {
        setState({ status: 'denied', session });
        return;
      }
      let name: string | null = null;
      try {
        name = await fetchOwnName(session.user.id);
      } catch {
        name = null;
      }
      if (seq !== checkSeq.current) return;
      setState({ status: 'ready', session, supervisorName: name || session.user.email || 'Supervisor' });
    } catch (err) {
      if (seq !== checkSeq.current) return;
      const error = toAppError(err);
      if (error.kind === 'session') {
        endingReason.current = 'expired';
        await client().auth.signOut({ scope: 'local' });
        return;
      }
      setState({ status: 'error', session, error });
    }
  }, []);

  useEffect(() => {
    const supabase = client();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // No se llama a Supabase dentro del callback (recomendación de supabase-js).
      setTimeout(() => {
        if (!session) {
          checkSeq.current += 1;
          const hadUser = currentUser.current !== null;
          currentUser.current = null;
          supabase.removeAllChannels();
          const reason = endingReason.current ?? (hadUser && event === 'SIGNED_OUT' ? 'expired' : null);
          endingReason.current = null;
          setState({ status: 'signedOut', reason });
          return;
        }
        if (currentUser.current === session.user.id && event !== 'INITIAL_SESSION') {
          // Renovación de token u otro evento de la misma cuenta: se conserva el
          // estado y solo se actualiza el objeto de sesión.
          setState((prev) => ('session' in prev ? { ...prev, session } : prev));
          return;
        }
        currentUser.current = session.user.id;
        void verify(session);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [verify]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
      return error ? loginMessage(error.message) : null;
    } catch (err) {
      return loginMessage(err instanceof Error ? err.message : '');
    }
  }, []);

  const endSession = useCallback(async (reason: SignedOutReason) => {
    endingReason.current = reason;
    const supabase = client();
    await supabase.removeAllChannels();
    // scope local: cierra solo esta ventana, no las sesiones del celular.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      checkSeq.current += 1;
      currentUser.current = null;
      endingReason.current = null;
      setState({ status: 'signedOut', reason });
    }
  }, []);

  const signOut = useCallback(() => endSession('manual'), [endSession]);
  const expire = useCallback(() => endSession('expired'), [endSession]);

  const recheck = useCallback(() => {
    const current = stateRef.current;
    if ('session' in current) void verify(current.session);
  }, [verify]);

  const value = useMemo(() => ({ state, signIn, signOut, expire, recheck }), [state, signIn, signOut, expire, recheck]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fuera de SessionProvider');
  return ctx;
}
