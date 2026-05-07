'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/auth-errors';
import PasswordInput from '../components/PasswordInput';

const USERNAME_POOL = [
  'quietriver', 'morningstone', 'stillwater', 'gentleoak', 'softrain',
  'wildbird', 'sunfield', 'darkmoss', 'whitepine', 'graycedar',
  'silentbrook', 'autumnlight', 'evergreenpath', 'mossymeadow', 'driftwood',
];
const SUGGESTION_COUNT = 5;
const TAKEN_USERNAME_MESSAGE = 'That username is already taken. Please choose a different one.';

function shuffled<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

async function fetchAvailableSuggestions(count: number): Promise<string[]> {
  const available: string[] = [];
  let candidates = shuffled(USERNAME_POOL);

  for (let round = 0; round < 5 && available.length < count; round++) {
    if (candidates.length === 0) {
      candidates = shuffled(USERNAME_POOL)
        .slice(0, count * 2)
        .map((n) => `${n}_${randomSuffix()}`);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .in('username', candidates);

    // Fail closed: if the availability check errors (e.g. invalid anon key,
    // RLS regression, network failure), do not show any candidates we
    // can't verify — otherwise taken usernames leak through.
    if (error) {
      console.warn('username availability check failed', error);
      return available.slice(0, count);
    }

    const taken = new Set((data ?? []).map((r: { username: string }) => r.username));
    for (const c of candidates) {
      if (!taken.has(c) && !available.includes(c)) {
        available.push(c);
        if (available.length >= count) break;
      }
    }
    candidates = [];
  }

  return available.slice(0, count);
}

function isUniqueViolation(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false;
  if (err.code === '23505') return true;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('duplicate key') || msg.includes('unique constraint');
}

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get('next') || '/';

  const [tab, setTab] = useState<'signup' | 'login'>(searchParams.get('tab') === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names = await fetchAvailableSuggestions(SUGGESTION_COUNT);
      if (!cancelled) setSuggestions(names);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (session.user.app_metadata?.provider === 'google') {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
          if (!existing) {
            const randomUsername = `${USERNAME_POOL[Math.floor(Math.random() * USERNAME_POOL.length)]}_${randomSuffix()}`;
            await supabase.from('profiles').insert({
              id: session.user.id,
              username: randomUsername,
              needs_username: true,
            });
          }
        } else if (session.user.app_metadata?.provider === 'email') {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
          if (!existing) {
            const pendingUsername = (session.user.user_metadata?.username as string | undefined)?.trim();
            if (pendingUsername) {
              await supabase.from('profiles').insert({
                id: session.user.id,
                username: pendingUsername,
                needs_username: false,
              });
            }
          }
        }
        router.push(next);
      }
    });
    return () => subscription.unsubscribe();
  }, [next, router]);

  async function refreshSuggestions() {
    const names = await fetchAvailableSuggestions(SUGGESTION_COUNT);
    setSuggestions(names);
  }

  async function handleSignUp() {
    setError('');
    setLoading(true);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please choose a username.');
      setLoading(false);
      return;
    }

    if (!ageConfirmed) {
      setError('You must be 18 or older to use Kith.');
      setLoading(false);
      return;
    }

    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();
    if (checkError) {
      // If the pre-check fails we can't tell if the name is taken; fall
      // through to signUp and rely on the unique-constraint catch path
      // below to show a friendly error.
      console.warn('username pre-submit check failed', checkError);
    } else if (existingProfile) {
      setError(TAKEN_USERNAME_MESSAGE);
      setLoading(false);
      refreshSuggestions();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmedUsername },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message, 'signup'));
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: trimmedUsername,
        needs_username: false,
      });
      if (profileError) {
        if (isUniqueViolation(profileError)) {
          setError(TAKEN_USERNAME_MESSAGE);
          refreshSuggestions();
        } else {
          setError(friendlyAuthError(profileError.message, 'signup'));
        }
        setLoading(false);
        return;
      }
      router.push(next);
    } else if (data.user && !data.session) {
      setPendingConfirmationEmail(email);
    }
    setLoading(false);
  }

  async function handleLogIn() {
    setError('');
    setLoading(true);

    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not sign in right now. Please try again in a moment.');
      setLoading(false);
      return;
    }

    // The server set the auth cookies on the response; do a full navigation so
    // the browser Supabase client picks up the new session on the next page.
    window.location.assign(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === 'signup') handleSignUp();
    else handleLogIn();
  }

  async function handleGoogleSignIn() {
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(next),
      },
    });
    if (oauthError) {
      setError(friendlyAuthError(oauthError.message, 'oauth'));
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">Welcome to Kith</h1>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          You can come here to talk, to listen, or to do both. You don't have to decide now.
        </p>

        <div className="bg-white shadow-card rounded-xl bg-card px-6 py-6">
          {pendingConfirmationEmail ? (
            <div className="text-center py-4">
              <h2 className="text-base font-medium text-stone-800 mb-2">Check your email</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                We sent a confirmation link to <span className="text-stone-700">{pendingConfirmationEmail}</span>. Click it to activate your account.
              </p>
              <p className="text-xs text-stone-400 mt-3">
                Don't see the email? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white border border-stone-200 text-stone-700 py-3 px-4 rounded-2xl text-sm font-medium hover:border-stone-400 transition-colors disabled:opacity-40 mb-4 flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400">or</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <div className="flex border-b border-stone-200 mb-6">
                <button
                  onClick={() => { setTab('signup'); setError(''); }}
                  className={'flex-1 pb-3 text-sm font-medium text-center transition-colors ' + (tab === 'signup' ? 'text-stone-800 border-b-2 border-stone-800' : 'text-stone-400')}
                >
                  Sign up
                </button>
                <button
                  onClick={() => { setTab('login'); setError(''); }}
                  className={'flex-1 pb-3 text-sm font-medium text-center transition-colors ' + (tab === 'login' ? 'text-stone-800 border-b-2 border-stone-800' : 'text-stone-400')}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'signup' && (
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:border-stone-400"
                    />
                    {suggestions.length > 0 && (
                      <p className="text-xs text-stone-400 mt-3 mb-1.5">Suggestions</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setUsername(name)}
                          className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (username === name ? 'border-stone-800 bg-stone-100 text-stone-800' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-400')}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    required
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  />
                  {tab === 'login' && (
                    <div className="mt-2 text-right">
                      <Link href="/auth/reset-password" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                  )}
                </div>

                {tab === 'signup' && (
                  <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                    />
                    <span>I confirm I am 18 years of age or older.</span>
                  </label>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
                >
                  {tab === 'signup' ? (loading ? 'Create account...' : 'Create account') : (loading ? 'Log in...' : 'Log in')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
