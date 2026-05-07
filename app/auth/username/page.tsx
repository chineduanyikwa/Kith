'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const USERNAME_FORMAT = /^[a-z0-9_]{3,20}$/;
const USERNAME_FORMAT_MESSAGE =
  'Usernames must be 3–20 characters and use only lowercase letters, numbers, and underscores.';
const USERNAME_TAKEN_MESSAGE = 'That username is already taken. Please choose a different one.';

function ChooseUsernameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next') || '/';
  const next =
    requestedNext === '/auth' || requestedNext.startsWith('/auth/') ? '/' : requestedNext;

  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?tab=login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, needs_username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile && !profile.needs_username) {
        router.push(next);
        return;
      }
      setUserId(user.id);
      setReady(true);
    }
    init();
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = username.trim();
    setError('');

    if (!USERNAME_FORMAT.test(trimmed)) {
      setError(USERNAME_FORMAT_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      let existing: { id: string } | null = null;
      try {
        const { data, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmed)
          .maybeSingle();
        if (checkError) {
          console.warn('username availability check failed', checkError);
          setError('Could not check that username right now. Please try again in a moment.');
          return;
        }
        existing = data;
      } catch (err) {
        console.warn('username availability check threw', err);
        setError('Could not check that username right now. Please try again in a moment.');
        return;
      }
      if (existing && existing.id !== userId) {
        setError(USERNAME_TAKEN_MESSAGE);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed, needs_username: false })
        .eq('id', userId);
      if (updateError) {
        const msg = (updateError.message ?? '').toLowerCase();
        if (
          updateError.code === '23505' ||
          msg.includes('duplicate key') ||
          msg.includes('unique constraint')
        ) {
          setError(USERNAME_TAKEN_MESSAGE);
        } else {
          setError('Could not save your username right now. Please try again in a moment.');
        }
        return;
      }

      router.push(next);
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
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2 text-center">Choose your username</h1>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          This is how others on Kith will see you. You can change it later.
        </p>

        <div className="bg-white shadow-card rounded-xl bg-card px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Username</label>
              <div className="flex items-center gap-2">
                <span className="text-stone-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoFocus
                  disabled={saving}
                  className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:border-stone-400 disabled:opacity-50"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving || username.trim().length === 0}
              className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ChooseUsernamePage() {
  return (
    <Suspense>
      <ChooseUsernameForm />
    </Suspense>
  );
}
