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
  it('reports sync as unavailable when Supabase is not configured', async () => {
    mockNoSupabase();
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const { fetchSyncHealth } = await import('./syncClient.js');
    const payload = await fetchSyncHealth();

    expect(payload.mode).toBe('supabase');
    expect(payload.configured).toBe(false);
    expect(payload.available).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses snapshot reads and writes when Supabase is not configured', async () => {
    mockNoSupabase();
    const { fetchSyncSnapshot, pushSyncSnapshot } = await import('./syncClient.js');

    await expect(fetchSyncSnapshot()).rejects.toThrow('Cloud sync is not configured');
    await expect(pushSyncSnapshot({ syncedAt: '2026-06-08T12:00:00.000Z' })).rejects.toThrow('Cloud sync is not configured');
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
