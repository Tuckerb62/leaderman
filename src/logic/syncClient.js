import { getSupabaseSessionState } from './supabaseAuth.js';
import { getSupabaseClient, isSupabaseConfigured, SUPABASE_PROFILE_TABLE } from '../utils/supabase.js';

function createBaseStatus(overrides = {}) {
  return {
    available: false,
    updatedAt: null,
    path: '',
    error: '',
    mode: 'local',
    localUrl: '',
    phoneUrls: [],
    hostMode: 'local',
    configured: false,
    authenticated: false,
    requiresSignIn: false,
    userEmail: '',
    userId: '',
    ...overrides,
  };
}

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || fallbackMessage);
  }
  return payload || {};
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

async function fetchLocalSyncHealth() {
  const response = await fetch('/api/sync-health');
  const payload = await parseResponse(response, 'Could not reach sync.');
  return createBaseStatus({
    ...payload,
    available: true,
    mode: 'local',
  });
}

async function fetchLocalSyncSnapshot() {
  const response = await fetch('/api/sync-state');
  return parseResponse(response, 'Could not load sync state.');
}

async function pushLocalSyncSnapshot(snapshot) {
  const response = await fetch('/api/sync-state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ snapshot }),
  });
  return parseResponse(response, 'Could not save sync state.');
}

async function fetchSupabaseSyncHealth() {
  const sessionState = await getSupabaseSessionState();
  if (!sessionState.configured) return createBaseStatus();

  const user = sessionState.user;
  if (!user) {
    return createBaseStatus({
      mode: 'supabase',
      hostMode: 'cloud',
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
      mode: 'supabase',
      hostMode: 'cloud',
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
    mode: 'supabase',
    hostMode: 'cloud',
    configured: true,
    authenticated: true,
    userEmail: user.email || data?.email || '',
    userId: user.id,
  });
}

async function fetchSupabaseSyncSnapshot() {
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

async function pushSupabaseSyncSnapshot(snapshot) {
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

export async function fetchSyncHealth() {
  if (isSupabaseConfigured()) return fetchSupabaseSyncHealth();

  try {
    return await fetchLocalSyncHealth();
  } catch (error) {
    return createBaseStatus({
      mode: 'local',
      error: error.message,
    });
  }
}

export async function fetchSyncSnapshot() {
  if (isSupabaseConfigured()) return fetchSupabaseSyncSnapshot();

  return fetchLocalSyncSnapshot();
}

export async function pushSyncSnapshot(snapshot) {
  if (isSupabaseConfigured()) return pushSupabaseSyncSnapshot(snapshot);

  return pushLocalSyncSnapshot(snapshot);
}
