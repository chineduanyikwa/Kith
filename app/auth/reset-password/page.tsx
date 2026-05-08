'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/auth-errors';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/update-password',
    });
    if (resetError) {
      Sentry.withScope((scope) => {
        scope.setTags({ page: 'reset-password', op: 'resetPasswordForEmail' });
        Sentry.captureException(resetError);
      });
      setError(friendlyAuthError(resetError.message, 'reset'));
      setLoading(false);
      return;
    }

    setSent(email);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">Reset your password</h1>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          We&apos;ll send you a link to choose a new one.
        </p>

        <div className="bg-white shadow-card rounded-xl bg-card px-6 py-6">
          {sent ? (
            <div className="text-center py-4">
              <h2 className="text-base font-medium text-stone-800 mb-2">Check your email</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                We sent a password reset link to <span className="text-stone-700">{sent}</span>.
              </p>
              <div className="mt-6">
                <Link href="/auth?tab=login" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
                  Back to log in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {loading ? 'Send reset link...' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link href="/auth?tab=login" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
                  Back to log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
