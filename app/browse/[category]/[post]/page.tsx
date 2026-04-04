'use client';

import { use, useEffect, useState } from 'react';
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
  anonymous: boolean;
  support_type: string | null;
  created_at: string;
  user_id?: string | null;
  profiles?: { username: string } | null;
};

type ResponseRow = {
  id: number;
  content: string;
  post_id: number;
  anonymous: boolean;
  created_at: string;
  profiles?: { username: string } | null;
  reportHref?: string;
};

export default function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category, post: postId } = use(params);
  const categoryName = decodeURIComponent(category)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const [post, setPost] = useState<Post | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondHref, setRespondHref] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_profiles_fkey(username)')
        .eq('id', postId)
        .single();

      const { data: responseData } = await supabase
        .from('responses')
        .select('*, profiles!responses_user_id_profiles_fkey(username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (postData) {
        const p = new URLSearchParams({ post_id: String(postData.id), category });
        setRespondHref('/respond?' + p.toString());
      }

      const rows = (responseData ?? []).map((r: ResponseRow) => {
        const p = new URLSearchParams({ target_type: 'response', target_id: String(r.id), category: category, post_id: String(postId) });
        return { ...r, reportHref: '/report?' + p.toString() };
      });

      setPost(postData);
      setResponses(rows);
      setLoading(false);
    }
    load();
  }, [postId, category]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <p className="text-stone-500 text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <a href={'/browse/' + category} className="text-sm text-stone-500 hover:text-stone-700">
            Back to {categoryName}
          </a>
          <p className="text-stone-400 mt-4">Post not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href={'/browse/' + category} className="text-sm text-stone-500 hover:text-stone-700">
          Back to {categoryName}
        </a>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 mt-6">
          {post.support_type && SUPPORT_LABELS[post.support_type] && (
            <span className="inline-block text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full mb-3">
              Needs: {SUPPORT_LABELS[post.support_type]}
            </span>
          )}
          <p className="text-stone-700 text-base leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-2 mt-3">
            <p className="text-xs text-stone-400">{post.anonymous ? 'Anonymous' : (post.profiles?.username ?? 'A member of Kith')}</p>
            <span className="text-stone-300 text-xs">·</span>
            <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-stone-500 text-sm">
            {responses.length === 1 ? '1 person' : String(responses.length) + ' people'} showed up
          </p>
        </div>

        <div className="space-y-3 mt-4">
          {responses.length > 0 ? (
            responses.map((response) => (
              <div key={response.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="text-stone-700 text-base leading-relaxed">{response.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-stone-400">{response.anonymous ? 'Anonymous' : (response.profiles?.username ?? 'A member of Kith')}</p>
                    <span className="text-stone-300 text-xs">·</span>
                    <span className="text-xs text-stone-400">{new Date(response.created_at).toLocaleDateString()}</span>
                  </div>
                  <a href={response.reportHref} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                    Report
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">Waiting for someone to show up.</p>
            </div>
          )}
        </div>

        {(!currentUserId || currentUserId !== post.user_id) && (
          <a href={respondHref} className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors mt-6">
            Respond to this
          </a>
        )}
      </div>
    </main>
  );
}
