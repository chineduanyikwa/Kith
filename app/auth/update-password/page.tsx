'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PasswordInput from '../../components/PasswordInput';

type Status = 'verifying' | 'ready' | 'invalid';

function getInitialStatus(): Status {
  if (typeof window === 'undefined') return 'verifying';
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errorParam =
    url.searchParams.get('error') ||
    hash.get('error') ||
    url.searchParams.get('error_description') ||
    hash.get('error_description');
  return errorParam ? 'invalid' : 'verifying';
}

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'verifying') return;

    let recoveryReceived = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryReceived = true;
        setStatus('ready');
      }
    });

    const grace = window.setTimeout(() => {
      if (!recoveryReceived) {
        setStatus((prev) => (prev === 'verifying' ? 'invalid' : prev));
      }
    }, 2500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(grace);
    };
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/');
    } else {
      router.push('/auth?tab=login');
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">Choose a new password</h1>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          Pick something only you know.
        </p>

        <div className="bg-white shadow-card rounded-xl bg-card px-6 py-6">
          {status === 'verifying' && (
            <p className="text-sm text-stone-500 text-center py-4">Verifying your link...</p>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <h2 className="text-base font-medium text-stone-800 mb-2">This link won&apos;t work</h2>
              <p className="text-sm text-stone-500 leading-relaxed mb-6">
                It may have expired or already been used. You can request a new one.
              </p>
              <Link
                href="/auth/reset-password"
                className="inline-block bg-stone-800 text-white py-3 px-6 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Request a new link
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">New password</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Confirm new password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {loading ? 'Please wait...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
