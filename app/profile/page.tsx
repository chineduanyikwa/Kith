'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
};

type Post = {
  id: number;
  content: string;
  category: string;
  support_type: string | null;
  created_at: string;
};

function formatCategory(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth?next=' + encodeURIComponent('/profile'));
        return;
      }
      setUserId(currentUser.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single();
      if (profile) setUsername(profile.username);

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (postsData) setPosts(postsData as Post[]);

      setReady(true);
    }
    init();
  }, [router]);

  async function handleDelete(postId: number) {
    if (!userId) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    const { error: dbError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    setError('');
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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
          <a href="/" className="text-sm text-stone-400 hover:text-stone-600">
            Back to Home
          </a>
          <h1 className="text-3xl font-bold text-stone-800 mt-2">Your profile</h1>
          {username && <p className="text-stone-500 mt-1">@{username}</p>}
        </div>

        <h2 className="text-sm font-medium text-stone-500 mb-3 mt-8">Your posts</h2>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="space-y-3">
          {posts.length > 0 ? (
            posts.map((post) => {
              const preview = post.content.length > 160 ? post.content.slice(0, 160) + '…' : post.content;
              return (
                <div
                  key={post.id}
                  className="bg-white shadow-card rounded-xl bg-card px-5 py-4"
                >
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                      {formatCategory(post.category)}
                    </span>
                    {post.support_type && SUPPORT_LABELS[post.support_type] && (
                      <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                        Needs: {SUPPORT_LABELS[post.support_type]}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{preview}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-400 text-sm">You haven't posted anything yet.</p>
              <a href="/browse?intent=talk" className="text-stone-400 text-sm mt-1 inline-block hover:text-stone-600">
                Find a space to speak.
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
