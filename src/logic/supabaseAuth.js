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
  return data;
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw formatSupabaseAuthError(error, 'Could not sign out.');
}
