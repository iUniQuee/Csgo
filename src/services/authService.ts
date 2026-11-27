/**
 * Auth service layer.
 *
 * Uses Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are
 * configured, and otherwise keeps local accounts in localStorage so the sign-in
 * gate works immediately. Both paths expose the same small async API, so the UI
 * never needs to know which one is active.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';

// The shared client owns the session, so the league and profile services can
// write under RLS with the signed-in manager's JWT.
const supabase = getSupabase;

export const isSupabaseAuth = isSupabaseConfigured;

export type AuthSession = {
  userId: string;
  email: string;
  provider: 'email' | 'google' | 'local';
};

type LocalAccount = { userId: string; email: string; passwordHash: string; createdAt: number };

const ACCOUNTS_KEY = 'cs2-auth-accounts-v1';
const SESSION_KEY = 'cs2-auth-session-v1';

function readAccounts(): Record<string, LocalAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalAccount>) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, LocalAccount>): void {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* storage unavailable */ }
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`cs2-ultimate-team:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Non-secure contexts have no WebCrypto; keep the fallback deterministic.
  let hash = 0;
  for (const byte of data) hash = (hash * 31 + byte) | 0;
  return `fallback-${hash}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) return 'Enter a valid email address.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

function fromUser(user: { id: string; email?: string | null; app_metadata?: { provider?: string } }): AuthSession {
  const provider = user.app_metadata?.provider;
  return {
    userId: user.id,
    email: user.email ?? '',
    provider: provider === 'google' ? 'google' : 'email',
  };
}

/** Turns provider errors into short, human messages. */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message ?? error ?? '');
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('already registered') || message.includes('already been registered')) return 'An account with this email already exists. Sign in instead.';
  if (message.includes('email not confirmed')) return 'Confirm your email address, then sign in.';
  if (message.includes('rate limit') || message.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (message.includes('provider is not enabled')) return 'Google sign-in is not enabled in Supabase yet. Use email and password.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Network unavailable. Check your connection and try again.';
  return raw || 'Something went wrong. Please try again.';
}

function localSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable */ }
}

export const authService = {
  /** True when real Supabase Auth is driving the session. */
  get isRemote(): boolean { return isSupabaseAuth; },

  async getSession(): Promise<AuthSession | null> {
    const remote = supabase();
    if (remote) {
      const { data, error } = await remote.auth.getSession();
      if (error || !data.session?.user) return null;
      return fromUser(data.session.user);
    }
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },

  /** Subscribe to sign-in / sign-out. Remote OAuth redirects land here. */
  onChange(callback: (session: AuthSession | null) => void): () => void {
    const remote = supabase();
    if (!remote) return () => {};
    const { data } = remote.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? fromUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const invalid = validateCredentials(email, password);
    if (invalid) throw new Error(invalid);
    const remote = supabase();
    if (remote) {
      const { data, error } = await remote.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error) throw error;
      if (!data.user) throw new Error('Sign-in failed. Please try again.');
      return fromUser(data.user);
    }
    const accounts = readAccounts();
    const account = accounts[normalizeEmail(email)];
    if (!account) throw new Error('No account found with this email. Create one instead.');
    if (account.passwordHash !== await hashPassword(password)) throw new Error('Incorrect email or password.');
    const session: AuthSession = { userId: account.userId, email: account.email, provider: 'local' };
    localSession(session);
    return session;
  },

  async signUp(email: string, password: string): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
    const invalid = validateCredentials(email, password);
    if (invalid) throw new Error(invalid);
    const remote = supabase();
    if (remote) {
      const { data, error } = await remote.auth.signUp({ email: normalizeEmail(email), password });
      if (error) throw error;
      return { session: data.user ? fromUser(data.user) : null, needsEmailConfirmation: !data.session };
    }
    const accounts = readAccounts();
    const key = normalizeEmail(email);
    if (accounts[key]) throw new Error('An account with this email already exists. Sign in instead.');
    const account: LocalAccount = {
      userId: `local-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
      email: key,
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    };
    accounts[key] = account;
    writeAccounts(accounts);
    const session: AuthSession = { userId: account.userId, email: account.email, provider: 'local' };
    localSession(session);
    return { session, needsEmailConfirmation: false };
  },

  async signInWithGoogle(): Promise<void> {
    const remote = supabase();
    if (!remote) throw new Error('Google sign-in needs Supabase keys. Use email and password for now.');
    const { error } = await remote.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const remote = supabase();
    if (remote) await remote.auth.signOut();
    localSession(null);
  },
};
