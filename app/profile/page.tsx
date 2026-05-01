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

type ResponseRow = {
  id: number;
  content: string;
  post_id: number;
  parent_id: number | null;
  anonymous: boolean;
  created_at: string;
};

type PostRef = { id: number; content: string; category: string };
type ParentRef = { id: number; anonymous: boolean; username: string | null };

type ResponseItem = ResponseRow & {
  post: PostRef | null;
  externalParent: ParentRef | null;
  children: ResponseItem[];
};

function formatCategory(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

export default function ProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [responseGroups, setResponseGroups] = useState<ResponseItem[]>([]);
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

      const { data: respData } = await supabase
        .from('responses')
        .select('id, content, post_id, parent_id, anonymous, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      const myResponses = (respData ?? []) as ResponseRow[];

      const postIds = Array.from(new Set(myResponses.map((r) => r.post_id)));
      const { data: postsForResp } = postIds.length
        ? await supabase
            .from('posts')
            .select('id, content, category')
            .in('id', postIds)
        : { data: [] as PostRef[] };
      const postsById = new Map<number, PostRef>(
        (postsForResp ?? []).map((p) => [p.id, p as PostRef]),
      );

      const myIds = new Set(myResponses.map((r) => r.id));
      const externalParentIds = Array.from(
        new Set(
          myResponses
            .filter((r) => r.parent_id != null && !myIds.has(r.parent_id))
            .map((r) => r.parent_id as number),
        ),
      );
      const { data: extParents } = externalParentIds.length
        ? await supabase
            .from('responses')
            .select('id, anonymous, profiles!responses_user_id_profiles_fkey(username)')
            .in('id', externalParentIds)
        : { data: [] };
      type ExtParentRow = { id: number; anonymous: boolean; profiles?: { username: string } | { username: string }[] | null };
      const externalParentsById = new Map<number, ParentRef>(
        ((extParents ?? []) as ExtParentRow[]).map((p) => {
          const profileField = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          return [p.id, { id: p.id, anonymous: p.anonymous, username: profileField?.username ?? null }];
        }),
      );

      const childrenByParent = new Map<number, ResponseRow[]>();
      for (const r of myResponses) {
        if (r.parent_id != null && myIds.has(r.parent_id)) {
          const arr = childrenByParent.get(r.parent_id) ?? [];
          arr.push(r);
          childrenByParent.set(r.parent_id, arr);
        }
      }
      for (const arr of childrenByParent.values()) {
        arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      const decorate = (r: ResponseRow): ResponseItem => ({
        ...r,
        post: postsById.get(r.post_id) ?? null,
        externalParent:
          r.parent_id != null && !myIds.has(r.parent_id)
            ? externalParentsById.get(r.parent_id) ?? null
            : null,
        children: (childrenByParent.get(r.id) ?? []).map(decorate),
      });

      const tops = myResponses
        .filter((r) => !(r.parent_id != null && myIds.has(r.parent_id)))
        .map(decorate);

      const recency = (item: ResponseItem): number => {
        const self = new Date(item.created_at).getTime();
        const childMax = item.children.reduce((m, c) => Math.max(m, recency(c)), 0);
        return Math.max(self, childMax);
      };
      tops.sort((a, b) => recency(b) - recency(a));

      setResponseGroups(tops);
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

  async function handleDeleteResponse(responseId: number) {
    if (!userId) return;
    if (!window.confirm('Delete this response? This cannot be undone.')) return;

    const { error: dbError } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseId)
      .eq('user_id', userId);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    setError('');
    const stripDeleted = (items: ResponseItem[]): ResponseItem[] =>
      items
        .filter((r) => r.id !== responseId)
        .map((r) => ({ ...r, children: stripDeleted(r.children) }));
    setResponseGroups((prev) => stripDeleted(prev));
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

  const renderResponse = (item: ResponseItem, isNested: boolean) => {
    const href = item.post ? `/browse/${item.post.category}/${item.post.id}` : '#';
    const isReply = item.parent_id != null;
    const parentLabel = item.externalParent
      ? (item.externalParent.anonymous
        ? 'Anonymous'
        : item.externalParent.username
          ? '@' + item.externalParent.username
          : 'A member of Kith')
      : null;

    return (
      <div
        key={item.id}
        className={isNested ? 'mt-3 pl-4 border-l-2 border-stone-200' : ''}
      >
        <div className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
          {item.post && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                  {formatCategory(item.post.category)}
                </span>
                {isReply && !isNested && (
                  <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                    ↳ Reply
                  </span>
                )}
                {isReply && isNested && (
                  <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                    ↳ Your reply
                  </span>
                )}
              </div>
              <a
                href={href}
                className="block text-xs text-stone-400 hover:text-stone-600 transition-colors leading-relaxed"
              >
                On: {truncate(item.post.content, 80)}
              </a>
              {parentLabel && (
                <p className="text-xs text-stone-400 mt-1">Replying to {parentLabel}</p>
              )}
            </div>
          )}
          <p className="text-stone-700 text-sm leading-relaxed">{item.content}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-stone-400">{new Date(item.created_at).toLocaleDateString()}</span>
            <button
              onClick={() => handleDeleteResponse(item.id)}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        {item.children.map((child) => renderResponse(child, true))}
      </div>
    );
  };

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

        <div className="border-t border-stone-200 mt-12 pt-8">
          <h2 className="text-sm font-medium text-stone-500 mb-3">Your responses</h2>

          <div className="space-y-3">
            {responseGroups.length > 0 ? (
              responseGroups.map((item) => renderResponse(item, false))
            ) : (
              <div className="text-center py-12">
                <p className="text-stone-400 text-sm">You haven&apos;t responded to anyone yet.</p>
                <a href="/browse?intent=help" className="text-stone-400 text-sm mt-1 inline-block hover:text-stone-600">
                  Find someone to show up for.
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
