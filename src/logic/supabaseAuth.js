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

  if (error) throw formatSupabaseAuthError(error, 'Could not send the magic link.');
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw formatSupabaseAuthError(error, 'Could not sign out.');
}
