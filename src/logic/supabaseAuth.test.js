import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
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
    authMock.resetPasswordForEmail.mockReset();
    authMock.updateUser.mockReset();
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

  it('reports an existing account instead of promising a confirmation email', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'existing@example.com', identities: [] }, session: null },
      error: null,
    });
    const { createSupabaseAccount } = await import('./supabaseAuth.js');

    await expect(createSupabaseAccount('existing@example.com', 'any-password'))
      .rejects.toThrow('An account with this email already exists');
  });

  it('sends a password reset email with a redirect back to the app', async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    const { sendPasswordResetEmail } = await import('./supabaseAuth.js');

    await sendPasswordResetEmail(' user@example.com ');

    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: expect.any(String),
    });
  });

  it('refuses to send a reset email without an address', async () => {
    const { sendPasswordResetEmail } = await import('./supabaseAuth.js');

    await expect(sendPasswordResetEmail('  ')).rejects.toThrow('Enter your email first.');
    expect(authMock.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('updates the password for the signed-in user', async () => {
    authMock.updateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const { updateSupabasePassword } = await import('./supabaseAuth.js');

    await updateSupabasePassword('new-password-123');

    expect(authMock.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });

  it('rejects passwords under six characters before calling Supabase', async () => {
    const { updateSupabasePassword } = await import('./supabaseAuth.js');

    await expect(updateSupabasePassword('tiny')).rejects.toThrow('at least 6 characters');
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });

  it('signs out only the current device session', async () => {
    authMock.signOut.mockResolvedValue({ error: null });
    const { signOutSupabase } = await import('./supabaseAuth.js');

    await signOutSupabase();

    expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
