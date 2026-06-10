import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROFILE_TABLE = 'user_profiles';

let cachedClient = null;
let cachedConfigKey = '';

function readEnv(name) {
  return import.meta.env?.[name]?.trim() || '';
}

export function getSupabaseConfig() {
  return {
    url: readEnv('VITE_SUPABASE_URL'),
    publishableKey: readEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
  };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}

export function getSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return null;

  const configKey = `${url}|${publishableKey}`;
  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'curiosity.supabase.auth.v1',
      },
    });
    cachedConfigKey = configKey;
  }

  return cachedClient;
}
