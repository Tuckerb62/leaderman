import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase.js';

function formatSupabaseAuthError(error, fallbackMessage) {
  return new Error(error?.message || fallbackMessage);
}

export async function getSupabaseSessionState() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      session: null,
      user: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw formatSupabaseAuthError(error, 'Could not load your sync session.');

  return {
    configured: true,
    session: data.session,
    user: data.session?.user || null,
  };
}

export function onSupabaseAuthStateChange(callback) {
  if (!isSupabaseConfigured()) return () => {};

  const supabase = getSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback({
      event,
      session,
      user: session?.user || null,
    });
  });

  return () => subscription.unsubscribe();
}

export async function sendSupabaseMagicLink(email) {
  if (!isSupabaseConfigured()) throw new Error('Supabase sync is not configured.');

  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) throw formatSupabaseAuthError(error, 'Could not send the sign-in email.');
}

function authRedirectUrl() {
  if (typeof window === 'undefined') return 'http://localhost/';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function signInSupabaseWithPassword(email, password) {
  if (!isSupabaseConfigured()) throw new Error('Supabase auth is not configured.');

  const cleanEmail = email.trim();
  if (!cleanEmail || !password) throw new Error('Enter an email and password.');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw formatSupabaseAuthError(error, 'Could not sign in.');
  return data;
}

export async function createSupabaseAccount(email, password) {
  if (!isSupabaseConfigured()) throw new Error('Supabase auth is not configured.');

  const cleanEmail = email.trim();
  if (!cleanEmail || !password) throw new Error('Enter an email and password.');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: authRedirectUrl(),
    },
  });

  if (error) throw formatSupabaseAuthError(error, 'Could not create your account.');

  // Supabase signals a repeated signup (account already exists) by returning a
  // user with an empty identities array and sending no email. Without this
  // check the app would tell the user to wait for an email that never comes.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Use Sign in instead — and if the password is not working, it needs to be reset.');
  }

  return data;
}

export async function sendPasswordResetEmail(email) {
  if (!isSupabaseConfigured()) throw new Error('Supabase auth is not configured.');

  const cleanEmail = email.trim();
  if (!cleanEmail) throw new Error('Enter your email first.');

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: authRedirectUrl(),
  });

  if (error) throw formatSupabaseAuthError(error, 'Could not send the reset email.');
}

export async function updateSupabasePassword(newPassword) {
  if (!isSupabaseConfigured()) throw new Error('Supabase auth is not configured.');

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Use a password with at least 6 characters.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw formatSupabaseAuthError(error, 'Could not update the password.');
  return data;
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw formatSupabaseAuthError(error, 'Could not sign out.');
}
