import { getSupabaseSessionState } from './supabaseAuth.js';
import { getSupabaseClient, isSupabaseConfigured, SUPABASE_PROFILE_TABLE } from '../utils/supabase.js';

function createBaseStatus(overrides = {}) {
  return {
    available: false,
    updatedAt: null,
    path: '',
    error: '',
    mode: 'supabase',
    configured: false,
    authenticated: false,
    requiresSignIn: false,
    userEmail: '',
    userId: '',
    ...overrides,
  };
}

function formatSupabaseSyncError(error) {
  const code = error?.code || '';
  if (code === 'PGRST205' || code === '42P01') {
    return 'Supabase sync is signed in, but public.user_profiles is missing or not exposed to the Data API.';
  }
  if (code === '42501') {
    return 'Supabase sync is signed in, but public.user_profiles is blocked by RLS or role grants.';
  }
  return error?.message || 'Could not reach Supabase sync.';
}

function normalizeSupabaseSnapshot(row) {
  if (!row?.app_state) return null;
  return {
    ...row.app_state,
    syncedAt: row.app_state.syncedAt || row.last_synced_at || row.updated_at || null,
  };
}

export async function fetchSyncHealth() {
  if (!isSupabaseConfigured()) return createBaseStatus();

  const sessionState = await getSupabaseSessionState();
  const user = sessionState.user;
  if (!user) {
    return createBaseStatus({
      path: `Supabase public.${SUPABASE_PROFILE_TABLE}`,
      configured: true,
      requiresSignIn: true,
    });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SUPABASE_PROFILE_TABLE)
    .select('user_id, email, last_synced_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return createBaseStatus({
      path: `Supabase public.${SUPABASE_PROFILE_TABLE}`,
      configured: true,
      authenticated: true,
      userEmail: user.email || '',
      userId: user.id,
      error: formatSupabaseSyncError(error),
    });
  }

  return createBaseStatus({
    available: true,
    updatedAt: data?.last_synced_at || data?.updated_at || null,
    path: `Supabase public.${SUPABASE_PROFILE_TABLE}`,
    configured: true,
    authenticated: true,
    userEmail: user.email || data?.email || '',
    userId: user.id,
  });
}

export async function fetchSyncSnapshot() {
  if (!isSupabaseConfigured()) {
    throw new Error('Cloud sync is not configured for this build.');
  }

  const sessionState = await getSupabaseSessionState();
  if (!sessionState.user) {
    throw new Error('Sign in before loading cloud sync.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SUPABASE_PROFILE_TABLE)
    .select('app_state, last_synced_at, updated_at')
    .eq('user_id', sessionState.user.id)
    .maybeSingle();

  if (error) throw new Error(formatSupabaseSyncError(error));

  return {
    snapshot: normalizeSupabaseSnapshot(data),
  };
}

export async function pushSyncSnapshot(snapshot) {
  if (!isSupabaseConfigured()) {
    throw new Error('Cloud sync is not configured for this build.');
  }

  const sessionState = await getSupabaseSessionState();
  if (!sessionState.user) {
    throw new Error('Sign in before saving cloud sync.');
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SUPABASE_PROFILE_TABLE)
    .upsert(
      {
        user_id: sessionState.user.id,
        email: sessionState.user.email || null,
        app_state: snapshot,
        last_synced_at: snapshot.syncedAt || now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    .select('app_state, last_synced_at, updated_at')
    .single();

  if (error) throw new Error(formatSupabaseSyncError(error));

  return {
    snapshot: normalizeSupabaseSnapshot(data) || snapshot,
  };
}
