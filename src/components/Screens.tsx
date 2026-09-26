import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { AppError } from '../lib/errors';
import type { SignedOutReason } from '../state/session';
import { Clock } from './Clock';
import { ClockMark, LogoutIcon } from './Icons';

export function Splash({ text }: { text: string }) {
  return (
    <main className="center">
      <ClockMark width={56} height={56} />
      <p role="status">{text}</p>
    </main>
  );
}

export function LoginScreen({ reason, onSubmit }: {
  reason: SignedOutReason;
  onSubmit: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(email, password);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <section className="login__side" aria-hidden="true">
        <div className="brand brand--light">
          <ClockMark />
          <p>Checador de asistencia</p>
        </div>
        <Clock className="clock--login" />
      </section>
      <section className="login__form">
        <form onSubmit={submit} noValidate={false}>
          <h1>Tablero de supervisión</h1>
          <p className="lead">Consulta las entradas y salidas registradas desde la app móvil.</p>
          {reason === 'expired' && <p className="notice notice--warn" role="alert">La sesión venció. Inicia sesión de nuevo.</p>}
          {reason === 'manual' && <p className="notice notice--info" role="status">Sesión cerrada.</p>}
          <label className="field">
            <span>Correo</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="notice notice--error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
          <p className="hint">
            Solo las cuentas autorizadas como supervisor pueden ver el tablero. Una cuenta normal de la app móvil no tiene acceso.
          </p>
        </form>
      </section>
    </main>
  );
}

export function AccessDenied({ session, onRecheck, onSignOut }: {
  session: Session; onRecheck: () => void; onSignOut: () => void;
}) {
  return (
    <main className="center center--card">
      <div className="card">
        <h1>Esta cuenta no tiene acceso al tablero</h1>
        <p>
          Iniciaste sesión como <strong>{session.user.email ?? 'cuenta sin correo'}</strong>. Solo las cuentas
          autorizadas como supervisor en Supabase pueden consultar las checadas de todos.
        </p>
        <p>Si deberías tener acceso, pide que autoricen este identificador con el script <code>supabase/scripts/autorizar_supervisor.sql</code>:</p>
        <p className="uuid"><code>{session.user.id}</code></p>
        <div className="row">
          <button type="button" className="btn" onClick={onRecheck}>Comprobar de nuevo</button>
          <button type="button" className="btn btn--ghost" onClick={onSignOut}><LogoutIcon /> Cerrar sesión</button>
        </div>
      </div>
    </main>
  );
}

export function SetupError({ error, onRecheck, onSignOut }: {
  error: AppError; onRecheck: () => void; onSignOut: () => void;
}) {
  const setup = error.kind === 'setup' || error.kind === 'forbidden';
  return (
    <main className="center center--card">
      <div className="card" role="alert">
        <h1>{setup ? 'Falta un paso de configuración' : 'No se pudo comprobar el acceso'}</h1>
        <p>{error.message}</p>
        {error.detail && <p className="notice__detail">Detalle técnico: {error.detail}</p>}
        <div className="row">
          <button type="button" className="btn" onClick={onRecheck}>Reintentar</button>
          <button type="button" className="btn btn--ghost" onClick={onSignOut}><LogoutIcon /> Cerrar sesión</button>
        </div>
      </div>
    </main>
  );
}

export function ConfigError({ problems }: { problems: string[] }) {
  return (
    <main className="center center--card">
      <div className="card" role="alert">
        <h1>La web no está configurada</h1>
        <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        <p>Crea <code>web/.env</code> a partir de <code>web/.env.example</code> y vuelve a iniciar <code>npm run dev</code> o a compilar.</p>
      </div>
    </main>
  );
}
