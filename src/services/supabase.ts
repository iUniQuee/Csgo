/**
 * Supabase client (PostgreSQL + Auth).
 *
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read from the environment.
 * When they are missing, or the client cannot be created, every caller falls back
 * to local mode: the sign-in gate still works with localStorage accounts and the
 * club save stays on this device.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const readEnv = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const SUPABASE_URL = readEnv(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** True when both environment variables are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** 'cloud' when Supabase is wired up, 'local' when the app is running offline. */
export const supabaseMode: 'cloud' | 'local' = isSupabaseConfigured ? 'cloud' : 'local';

let client: SupabaseClient | null = null;
let broken = false;

/**
 * The one shared Supabase client for the whole app. Sharing it keeps the auth
 * session (and therefore the JWT that RLS checks) available to the league and
 * profile services instead of each service holding a sessionless client.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || broken) return null;
  if (client) return client;
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch (error) {
    broken = true;
    console.warn('[supabase] Could not create the client, running in local mode:', error);
  }
  return client;
}
