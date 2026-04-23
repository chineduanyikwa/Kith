'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUGGESTED_USERNAMES = ['quietriver', 'morningstone', 'stillwater', 'gentleoak', 'softrain'];

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
            const randomUsername = SUGGESTED_USERNAMES[Math.floor(Math.random() * SUGGESTED_USERNAMES.length)];
            await supabase.from('profiles').insert({
              id: session.user.id,
              username: randomUsername,
            });
          }
        }
        router.push(next);
      }
    });
    return () => subscription.unsubscribe();
  }, [next, router]);

  async function handleSignUp() {
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Please choose a username.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.trim(),
      });
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      router.push(next);
    }
    setLoading(false);
  }

  async function handleLogIn() {
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
    } else {
      router.push(next);
    }
    setLoading(false);
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
        redirectTo: window.location.origin + next,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
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
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-stone-200 text-stone-700 py-3 px-4 rounded-2xl text-sm font-medium hover:border-stone-400 transition-colors disabled:opacity-40 mb-4"
          >
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_USERNAMES.map((name) => (
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
            >
              {loading ? 'Please wait...' : tab === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>
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
