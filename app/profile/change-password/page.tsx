'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/lib/supabase';
import PasswordInput from '../../components/PasswordInput';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?next=' + encodeURIComponent('/profile/change-password'));
        return;
      }
      if (user.app_metadata?.provider === 'google') {
        router.push('/profile');
        return;
      }
      setUserEmail(user.email ?? null);
      setReady(true);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userEmail) return;
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) {
        Sentry.withScope((scope) => {
          scope.setTags({ page: 'change-password', op: 'signInWithPassword', source: 'change-password-reauth' });
          Sentry.captureException(signInError);
        });
        setError('Current password is incorrect.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        Sentry.withScope((scope) => {
          scope.setTags({ page: 'change-password', op: 'updateUser' });
          Sentry.captureException(updateError);
        });
        setError('Could not update your password right now. Please try again in a moment.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="max-w-md mx-auto pt-12 text-center">
          <p className="text-stone-500 text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a
            href="/profile"
            aria-label="Back to profile"
            className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2">Change password</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-card rounded-xl bg-card px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Current password</label>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">New password</label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
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
          {success && <p className="text-sm text-green-600">Password updated successfully.</p>}

          <button
            type="submit"
            disabled={
              saving ||
              currentPassword.length === 0 ||
              newPassword.length === 0 ||
              confirmPassword.length === 0
            }
            className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </main>
  );
}
