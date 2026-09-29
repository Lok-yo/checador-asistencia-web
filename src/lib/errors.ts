export type AppErrorKind = 'setup' | 'forbidden' | 'session' | 'network' | 'unknown';

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly detail?: string;

  constructor(kind: AppErrorKind, message: string, detail?: string) {
    super(message);
    this.kind = kind;
    this.detail = detail;
  }
}

type Raw = { code?: string; message?: string; details?: string; hint?: string; status?: number; statusCode?: string | number };

const SETUP_HINT = 'Revisa la configuración de Supabase indicada en el README de este repositorio.';

export function toAppError(err: unknown, status?: number): AppError {
  if (err instanceof AppError) return err;
  const raw = (err ?? {}) as Raw;
  const code = raw.code ?? '';
  const message = raw.message ?? (err instanceof Error ? err.message : String(err));
  const detail = [code, message, raw.details, raw.hint].filter(Boolean).join(' | ');
  const httpStatus = status ?? raw.status ?? (raw.statusCode ? Number(raw.statusCode) : undefined);

  if (err instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message)) {
    return new AppError('network', 'No hay conexión con Supabase. Revisa la red; los datos se volverán a consultar al recuperarla.', detail);
  }
  if (code === 'PGRST205' || code === '42P01' || code === 'PGRST202' || code === '42883' || /schema cache/i.test(message)) {
    return new AppError('setup', `Falta configurar la base de datos para la web. ${SETUP_HINT}`, detail);
  }
  if (code.startsWith('PGRST30') || httpStatus === 401 || /jwt expired|invalid jwt|refresh token/i.test(message)) {
    return new AppError('session', 'La sesión venció. Inicia sesión de nuevo.', detail);
  }
  if (code === '42501' || httpStatus === 403) {
    return new AppError('forbidden', `Supabase rechazó la consulta por permisos. Comprueba que la cuenta sea supervisor y que las políticas estén aplicadas. ${SETUP_HINT}`, detail);
  }
  return new AppError('unknown', 'Supabase respondió con un error inesperado.', detail);
}
