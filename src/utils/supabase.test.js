import { afterEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn(() => ({ auth: {} }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  createClientMock.mockClear();
});

describe('supabase client config', () => {
  it('uses a stable app storage key so signed-in devices are remembered', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    const { getSupabaseClient } = await import('./supabase.js');

    getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_test',
      {
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: 'curiosity.supabase.auth.v1',
        }),
      },
    );
  });
});
