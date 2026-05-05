'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const USERNAME_FORMAT = /^[a-z0-9_]{3,20}$/;
const USERNAME_FORMAT_MESSAGE =
  'Usernames must be 3–20 characters and use only lowercase letters, numbers, and underscores.';
const USERNAME_TAKEN_MESSAGE = 'That username is already taken. Please choose a different one.';

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

type PostItem = Post & {
  responseCount: number;
  recency: number;
};

type ResponseItem = {
  id: number;
  content: string;
  created_at: string;
  recency: number;
  post: {
    id: number;
    content: string;
    category: string;
    authorUsername: string | null;
    authorAnonymous: boolean;
  };
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
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/auth?next=' + encodeURIComponent('/profile'));
        return;
      }
      const me = currentUser.id;
      setUserId(me);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', me)
        .single();
      if (profile) setUsername(profile.username);

      // Section 1: my posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, category, support_type, created_at')
        .eq('user_id', me);
      const myPosts = (postsData ?? []) as Post[];

      // Section 2: my top-level responses (parent_id null)
      const { data: respData } = await supabase
        .from('responses')
        .select('id, content, post_id, created_at')
        .eq('user_id', me)
        .is('parent_id', null);
      type MyTopResp = { id: number; content: string; post_id: number; created_at: string };
      const myTopResp = (respData ?? []) as MyTopResp[];

      // Fetch posts referenced by my top-level responses to filter out my own posts
      // and to get the post preview, category, and author.
      const respPostIds = Array.from(new Set(myTopResp.map((r) => r.post_id)));
      type PostForResp = {
        id: number;
        content: string;
        category: string;
        user_id: string | null;
        anonymous: boolean;
        profiles?: { username: string } | { username: string }[] | null;
      };
      const { data: respPostsData } = respPostIds.length
        ? await supabase
            .from('posts')
            .select('id, content, category, user_id, anonymous, profiles!posts_user_id_profiles_fkey(username)')
            .in('id', respPostIds)
        : { data: [] as PostForResp[] };
      const postsForResp = new Map<number, PostForResp>(
        ((respPostsData ?? []) as PostForResp[]).map((p) => [p.id, p]),
      );

      // Keep only top-level responses on someone else's post
      const myTopOnOthers = myTopResp.filter(
        (r) => (postsForResp.get(r.post_id)?.user_id ?? null) !== me,
      );

      // Fetch every response on the involved posts (mine + posts I responded to)
      // so we can compute response counts and subtree recency.
      const involvedPostIds = Array.from(
        new Set<number>([...myPosts.map((p) => p.id), ...myTopOnOthers.map((r) => r.post_id)]),
      );
      type AnyResp = { id: number; post_id: number; parent_id: number | null; created_at: string };
      const { data: allRespData } = involvedPostIds.length
        ? await supabase
            .from('responses')
            .select('id, post_id, parent_id, created_at')
            .in('post_id', involvedPostIds)
        : { data: [] as AnyResp[] };
      const allResp = (allRespData ?? []) as AnyResp[];

      // Build childrenByParent for subtree walks
      const childrenByParent = new Map<number, AnyResp[]>();
      for (const r of allResp) {
        if (r.parent_id != null) {
          const arr = childrenByParent.get(r.parent_id) ?? [];
          arr.push(r);
          childrenByParent.set(r.parent_id, arr);
        }
      }
      const subtreeMaxTime = (rootId: number, baseTime: number): number => {
        let max = baseTime;
        const stack: number[] = [rootId];
        while (stack.length) {
          const cur = stack.pop() as number;
          const kids = childrenByParent.get(cur) ?? [];
          for (const k of kids) {
            const t = new Date(k.created_at).getTime();
            if (t > max) max = t;
            stack.push(k.id);
          }
        }
        return max;
      };

      // Section 1 items: top-level response count + activity recency
      const respByPost = new Map<number, AnyResp[]>();
      for (const r of allResp) {
        const arr = respByPost.get(r.post_id) ?? [];
        arr.push(r);
        respByPost.set(r.post_id, arr);
      }
      const postItems: PostItem[] = myPosts.map((p) => {
        const onPost = respByPost.get(p.id) ?? [];
        const responseCount = onPost.filter((r) => r.parent_id == null).length;
        const postTime = new Date(p.created_at).getTime();
        const activityMax = onPost.reduce(
          (m, r) => Math.max(m, new Date(r.created_at).getTime()),
          postTime,
        );
        return { ...p, responseCount, recency: activityMax };
      });
      postItems.sort((a, b) => b.recency - a.recency);

      // Section 2 items: own thread continuation = subtree of my top-level response
      const responseItems: ResponseItem[] = myTopOnOthers.map((r) => {
        const post = postsForResp.get(r.post_id) as PostForResp;
        const profileField = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        const authorUsername = profileField?.username ?? null;
        const selfTime = new Date(r.created_at).getTime();
        return {
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          recency: subtreeMaxTime(r.id, selfTime),
          post: {
            id: post.id,
            content: post.content,
            category: post.category,
            authorUsername,
            authorAnonymous: post.anonymous,
          },
        };
      });
      responseItems.sort((a, b) => b.recency - a.recency);

      setPosts(postItems);
      setResponses(responseItems);
      setReady(true);
    }
    init();
  }, [router]);

  function startEditingUsername() {
    setUsernameDraft(username ?? '');
    setUsernameError('');
    setUsernameSuccess(false);
    setEditingUsername(true);
  }

  function cancelEditingUsername() {
    setEditingUsername(false);
    setUsernameDraft('');
    setUsernameError('');
  }

  async function handleSaveUsername() {
    if (!userId) return;
    const trimmed = usernameDraft.trim();
    setUsernameError('');
    setUsernameSuccess(false);

    if (trimmed === username) {
      setEditingUsername(false);
      return;
    }
    if (!USERNAME_FORMAT.test(trimmed)) {
      setUsernameError(USERNAME_FORMAT_MESSAGE);
      return;
    }

    setSavingUsername(true);
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
          setUsernameError('Could not verify username availability. Please try again.');
          return;
        }
        existing = data;
      } catch (err) {
        console.warn('username availability check threw', err);
        setUsernameError('Could not verify username availability. Please try again.');
        return;
      }
      if (existing && existing.id !== userId) {
        setUsernameError(USERNAME_TAKEN_MESSAGE);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', userId);
      if (updateError) {
        const msg = (updateError.message ?? '').toLowerCase();
        if (
          updateError.code === '23505' ||
          msg.includes('duplicate key') ||
          msg.includes('unique constraint')
        ) {
          setUsernameError(USERNAME_TAKEN_MESSAGE);
        } else {
          setUsernameError('Could not update username. Please try again.');
        }
        return;
      }

      setUsername(trimmed);
      setEditingUsername(false);
      setUsernameDraft('');
      setUsernameSuccess(true);
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleDeletePost(postId: number) {
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

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(body?.error ?? 'Could not delete account. Please try again.');
        setDeletingAccount(false);
        return;
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleteError('Could not delete account. Please try again.');
      setDeletingAccount(false);
    }
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
    setResponses((prev) => prev.filter((r) => r.id !== responseId));
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
          {username && !editingUsername && (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-stone-500">@{username}</p>
              <button
                type="button"
                onClick={startEditingUsername}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Edit username"
              >
                Edit username
              </button>
            </div>
          )}
          {editingUsername && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-500">@</span>
                <input
                  type="text"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  autoFocus
                  disabled={savingUsername}
                  className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-700 text-sm focus:outline-none focus:border-stone-400 disabled:opacity-50"
                />
              </div>
              {usernameError && (
                <p className="text-xs text-red-500 mt-2">{usernameError}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleSaveUsername}
                  disabled={savingUsername || usernameDraft.trim().length === 0}
                  className="bg-stone-800 text-white py-1.5 px-3 rounded-xl text-xs font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
                >
                  {savingUsername ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditingUsername}
                  disabled={savingUsername}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {usernameSuccess && !editingUsername && (
            <p className="text-xs text-green-600 mt-1">Username updated.</p>
          )}
        </div>

        <h2 className="text-sm font-medium text-stone-500 mb-3 mt-8">Your posts</h2>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="space-y-3">
          {posts.length > 0 ? (
            posts.map((post) => {
              const preview = post.content.length > 160 ? post.content.slice(0, 160) + '…' : post.content;
              const href = `/browse/${post.category}/${post.id}?from=profile`;
              const showedUp =
                post.responseCount === 0
                  ? 'No one yet'
                  : post.responseCount === 1
                  ? '1 person showed up'
                  : `${post.responseCount} people showed up`;
              return (
                <div
                  key={post.id}
                  className="bg-white shadow-card rounded-xl bg-card px-5 py-4"
                >
                  <a href={href} className="block">
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
                  </a>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="text-stone-300 text-xs">·</span>
                      <span className="text-xs text-stone-400">{showedUp}</span>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
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
              <p className="text-stone-400 text-sm">You haven&apos;t shared anything yet.</p>
              <a href="/browse?intent=talk" className="text-stone-400 text-sm mt-1 inline-block hover:text-stone-600">
                Find a space to speak.
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 mt-12 pt-8">
          <h2 className="text-sm font-medium text-stone-500 mb-3">Your responses</h2>

          <div className="space-y-3">
            {responses.length > 0 ? (
              responses.map((item) => {
                const href = `/browse/${item.post.category}/${item.post.id}?from=profile`;
                const authorLabel = item.post.authorAnonymous
                  ? 'Anonymous'
                  : item.post.authorUsername
                  ? '@' + item.post.authorUsername
                  : 'A member of Kith';
                return (
                  <div
                    key={item.id}
                    className="bg-white shadow-card rounded-xl bg-card px-5 py-4"
                  >
                    <a href={href} className="block">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                          {formatCategory(item.post.category)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        On {authorLabel}: {truncate(item.post.content, 80)}
                      </p>
                      <p className="text-stone-700 text-sm leading-relaxed mt-2">{item.content}</p>
                    </a>
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
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-stone-400 text-sm">You haven&apos;t shown up for anyone yet.</p>
                <a href="/browse?intent=help" className="text-stone-400 text-sm mt-1 inline-block hover:text-stone-600">
                  Find someone to show up for.
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-stone-200 mt-12 pt-8">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => {
                setDeleteError('');
                setConfirmingDelete(true);
              }}
              className="text-sm text-red-600/80 hover:text-red-700 transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
              <p className="text-sm text-stone-700 leading-relaxed">
                This will permanently delete your account and all your posts and responses.
                This cannot be undone.
              </p>
              {deleteError && (
                <p className="text-xs text-red-500 mt-3">{deleteError}</p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="bg-red-600 text-white py-1.5 px-3 rounded-xl text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError('');
                  }}
                  disabled={deletingAccount}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
