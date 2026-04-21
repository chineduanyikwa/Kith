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
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const pendingUsername = localStorage.getItem('kith_pending_username');
        if (pendingUsername) {
          await supabase.from('profiles').insert({
            id: session.user.id,
            username: pendingUsername,
          });
          localStorage.removeItem('kith_pending_username');
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

    if (useMagicLink) {
      localStorage.setItem('kith_pending_username', username.trim());
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (otpError) {
        setError(otpError.message);
        localStorage.removeItem('kith_pending_username');
      } else {
        setSuccessMessage('Check your email for the magic link.');
      }
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

    if (useMagicLink) {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (otpError) {
        setError(otpError.message);
      } else {
        setSuccessMessage('Check your email for the magic link.');
      }
      return;
    }

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

  if (successMessage) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-8">
        <div className="max-w-md mx-auto pt-12">
          <div className="bg-white shadow-card rounded-xl bg-card px-6 py-8 text-center">
            <p className="text-stone-800 text-lg font-medium mb-2">Check your email</p>
            <p className="text-stone-500 text-sm">{successMessage}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">Welcome to Kith</h1>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          You can come here to talk, to listen, or to do both. You don't have to decide now.
        </p>

        <div className="bg-white shadow-card rounded-xl bg-card px-6 py-6">
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

            {!useMagicLink && (
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={!useMagicLink}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setUseMagicLink(!useMagicLink)}
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              <div className={'w-4 h-4 rounded border-2 flex items-center justify-center ' + (useMagicLink ? 'border-stone-800 bg-stone-800' : 'border-stone-300')}>
                {useMagicLink && <span className="text-white text-xs">✓</span>}
              </div>
              Send magic link instead
            </button>

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
