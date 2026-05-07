import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Metadata } from 'next';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — Kith`,
  };
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      setAll: () => {},
    },
  });
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="px-6 py-12 max-w-2xl mx-auto">
        <a href="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors inline-block mb-8">
          ← Back to Home
        </a>
        <p className="text-stone-700">User not found.</p>
      </div>
    );
  }

  const [{ count: talkerCount }, { count: helperCount }] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .is('parent_id', null),
  ]);

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <a href="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors inline-block mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl font-bold text-stone-800 mb-10">{profile.username}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-stone-200 p-6">
          <p className="text-sm text-stone-500 mb-1">Talker</p>
          <p className="text-3xl font-semibold text-stone-800">{talkerCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-stone-200 p-6">
          <p className="text-sm text-stone-500 mb-1">Helper</p>
          <p className="text-3xl font-semibold text-stone-800">{helperCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
