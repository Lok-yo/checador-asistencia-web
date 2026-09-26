export const DEFAULT_TIME_ZONE = 'America/Hermosillo';

export type AppConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  timeZone: string;
};

export type ConfigResult =
  | { ok: true; config: AppConfig; warnings: string[] }
  | { ok: false; problems: string[] };

function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Detecta si una clave JWT heredada es service_role sin validar su firma.
function jwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function readConfig(): ConfigResult {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const zone = import.meta.env.VITE_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    problems.push('Falta VITE_SUPABASE_URL en el archivo .env.');
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        problems.push('VITE_SUPABASE_URL debe usar https://.');
      }
    } catch {
      problems.push('VITE_SUPABASE_URL no es una URL válida.');
    }
  }

  if (!key) {
    problems.push('Falta VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.');
  } else if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY contiene una clave administrativa. Usa la clave publicable (sb_publishable_...) o anon; la clave secreta nunca debe llegar al navegador.');
  }

  let timeZone = zone;
  if (!isValidZone(zone)) {
    warnings.push(`La zona horaria "${zone}" no es válida; se usa ${DEFAULT_TIME_ZONE}.`);
    timeZone = DEFAULT_TIME_ZONE;
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, config: { supabaseUrl: url, supabaseKey: key, timeZone }, warnings };
}

export const configResult = readConfig();
