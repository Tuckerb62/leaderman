import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../utils/supabase.js', () => ({
  getSupabaseClient: () => ({ auth: authMock }),
  isSupabaseConfigured: () => true,
}));

describe('supabase auth helpers', () => {
  beforeEach(() => {
    authMock.signInWithPassword.mockReset();
    authMock.signUp.mockReset();
    authMock.signOut.mockReset();
  });

  it('signs in with email and password', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' }, session: { access_token: 'token' } },
      error: null,
    });
    const { signInSupabaseWithPassword } = await import('./supabaseAuth.js');

    const result = await signInSupabaseWithPassword(' user@example.com ', 'secret-password');

    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret-password',
    });
    expect(result.user.email).toBe('user@example.com');
  });

  it('creates an account with email and password', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'new@example.com' }, session: { access_token: 'token' } },
      error: null,
    });
    const { createSupabaseAccount } = await import('./supabaseAuth.js');

    const result = await createSupabaseAccount(' new@example.com ', 'new-password');

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'new-password',
      options: expect.objectContaining({
        emailRedirectTo: expect.any(String),
      }),
    });
    expect(result.user.email).toBe('new@example.com');
  });

  it('signs out only the current device session', async () => {
    authMock.signOut.mockResolvedValue({ error: null });
    const { signOutSupabase } = await import('./supabaseAuth.js');

    await signOutSupabase();

    expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
