import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { configResult } from './config';

// Solo se crea con credenciales públicas. La sesión del supervisor la emite
// Supabase Auth al iniciar sesión; la clave pública no da acceso por sí sola.
export const supabase: SupabaseClient | null = configResult.ok
  ? createClient(configResult.config.supabaseUrl, configResult.config.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}
