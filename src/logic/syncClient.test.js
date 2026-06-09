import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function mockNoSupabase() {
  vi.doMock('../utils/supabase.js', () => ({
    getSupabaseClient: () => null,
    isSupabaseConfigured: () => false,
    SUPABASE_PROFILE_TABLE: 'user_profiles',
  }));
  vi.doMock('./supabaseAuth.js', () => ({
    getSupabaseSessionState: async () => ({
      configured: false,
      session: null,
      user: null,
    }),
  }));
}

describe('sync client', () => {
  it('calls the built-in sync bridge health endpoint', async () => {
    mockNoSupabase();
    const { fetchSyncHealth } = await import('./syncClient.js');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    });
    globalThis.fetch = fetchMock;

    const payload = await fetchSyncHealth();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-health');
    expect(payload.mode).toBe('local');
    expect(payload.available).toBe(true);
  });

  it('loads the built-in sync snapshot', async () => {
    mockNoSupabase();
    const { fetchSyncSnapshot } = await import('./syncClient.js');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: null }),
    });
    globalThis.fetch = fetchMock;

    await fetchSyncSnapshot();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-state');
  });

  it('posts snapshots to the built-in sync endpoint', async () => {
    mockNoSupabase();
    const { pushSyncSnapshot } = await import('./syncClient.js');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: { syncedAt: '2026-06-08T12:00:00.000Z' } }),
    });
    globalThis.fetch = fetchMock;

    await pushSyncSnapshot({ syncedAt: '2026-06-08T12:00:00.000Z' });

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot: { syncedAt: '2026-06-08T12:00:00.000Z' } }),
    });
  });

  it('reports sign-in required when Supabase is configured without a session', async () => {
    vi.doMock('../utils/supabase.js', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      isSupabaseConfigured: () => true,
      SUPABASE_PROFILE_TABLE: 'user_profiles',
    }));
    vi.doMock('./supabaseAuth.js', () => ({
      getSupabaseSessionState: async () => ({
        configured: true,
        session: null,
        user: null,
      }),
    }));

    const { fetchSyncHealth } = await import('./syncClient.js');
    const payload = await fetchSyncHealth();

    expect(payload.mode).toBe('supabase');
    expect(payload.requiresSignIn).toBe(true);
    expect(payload.available).toBe(false);
  });

  it('reads sync state from Supabase when configured', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        app_state: { syncedAt: '2026-06-08T12:00:00.000Z', reviews: {} },
        last_synced_at: '2026-06-08T12:00:00.000Z',
        updated_at: '2026-06-08T12:00:01.000Z',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    vi.doMock('../utils/supabase.js', () => ({
      getSupabaseClient: () => ({ from }),
      isSupabaseConfigured: () => true,
      SUPABASE_PROFILE_TABLE: 'user_profiles',
    }));
    vi.doMock('./supabaseAuth.js', () => ({
      getSupabaseSessionState: async () => ({
        configured: true,
        session: { user: { id: 'user-1', email: 'test@example.com' } },
        user: { id: 'user-1', email: 'test@example.com' },
      }),
    }));

    const { fetchSyncSnapshot } = await import('./syncClient.js');
    const payload = await fetchSyncSnapshot();

    expect(from).toHaveBeenCalledWith('user_profiles');
    expect(payload.snapshot?.syncedAt).toBe('2026-06-08T12:00:00.000Z');
  });
});
