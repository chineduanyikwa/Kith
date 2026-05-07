'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { containsCrisisLanguage, MANI_NUMBER } from '@/lib/crisis';

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
};

const REPORT_REASONS = [
  'Harmful advice',
  'Judgment or shaming',
  'Abuse or insults',
  'Sexual or inappropriate content',
  'Manipulative behavior',
  'Spam or irrelevant',
  'Something else',
];

type ReportTarget =
  | { kind: 'response'; id: number }
  | { kind: 'user'; userId: string; username: string };

function FlagIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 21V4M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}

type Post = {
  id: number;
  content: string;
  category: string;
  anonymous: boolean;
  support_type: string | null;
  created_at: string;
  resolved: boolean;
  user_id?: string | null;
  profiles?: { username: string } | null;
};

type ResponseRow = {
  id: number;
  content: string;
  post_id: number;
  parent_id: number | null;
  user_id: string | null;
  anonymous: boolean;
  created_at: string;
  profiles?: { username: string } | null;
};

type ResponseNode = ResponseRow & {
  reportHref: string;
  replyHref: string;
  canReply: boolean;
  children: ResponseNode[];
};

const SNIPPET_PRIVATE = 60;
const SNIPPET_PUBLIC = 100;

function previewSnippet(content: string, full: boolean) {
  const flat = content.replace(/\s+/g, ' ').trim();
  const max = full ? SNIPPET_PUBLIC : SNIPPET_PRIVATE;
  return flat.length > max ? flat.slice(0, max).trimEnd() + '…' : flat;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d`;
  return d.toLocaleDateString();
}

function flattenThread(node: ResponseNode): ResponseNode[] {
  return [node, ...node.children.flatMap(flattenThread)];
}

export default function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category, post: postId } = use(params);
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const from = searchParams.get('from');
  const fromProfile = from === 'profile';
  const categoryName = decodeURIComponent(category)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const backHref = fromProfile
    ? '/profile'
    : `/browse/${category}`;
  const notFoundBackHref = fromProfile
    ? '/profile'
    : `/browse/${category}${intent ? `?intent=${intent}` : ''}`;
  const backLabel = fromProfile ? 'Back to your profile' : `Back to ${categoryName}`;

  const [post, setPost] = useState<Post | null>(null);
  const [tree, setTree] = useState<ResponseNode[]>([]);
  const [topLevelCount, setTopLevelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [respondHref, setRespondHref] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<ResponseRow[]>([]);
  const [resolving, setResolving] = useState(false);
  const [helpedState, setHelpedState] = useState<Record<number, 'confirm' | 'gone'>>({});

  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(() => {
    const t = searchParams.get('thread');
    const n = t ? parseInt(t, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  });
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [showReplyCrisis, setShowReplyCrisis] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleHelped(responseId: number) {
    setHelpedState((s) => ({ ...s, [responseId]: 'confirm' }));
    setTimeout(() => {
      setHelpedState((s) => ({ ...s, [responseId]: 'gone' }));
    }, 8000);
  }

  async function handleMarkResolved() {
    if (!post || resolving) return;
    setResolving(true);
    const { error } = await supabase
      .from('posts')
      .update({ resolved: true })
      .eq('id', post.id);
    setResolving(false);
    if (error) {
      console.error(error);
      return;
    }
    setPost({ ...post, resolved: true });
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      setCurrentUserId(userId);

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

      const all = (responseData ?? []) as ResponseRow[];
      const postAuthorId = postData?.user_id ?? null;
      const childrenOf = (id: number) => all.some((r) => r.parent_id === id);

      const byId = new Map<number, ResponseRow>(all.map((r) => [r.id, r]));
      const threadHelperOf = (r: ResponseRow): string | null => {
        let cur: ResponseRow | undefined = r;
        while (cur && cur.parent_id != null) {
          cur = byId.get(cur.parent_id);
        }
        return cur ? cur.user_id : null;
      };

      const canReplyTo = (r: ResponseRow): boolean => {
        if (!userId || !postAuthorId) return false;
        if (childrenOf(r.id)) return false;
        const helperId = threadHelperOf(r);
        if (!helperId) return false;
        // Thread is strictly between postAuthor and helperId; alternation requires
        // the current user to be one participant and r.user_id to be the other.
        const participants = new Set([postAuthorId, helperId]);
        if (!participants.has(userId)) return false;
        if (!participants.has(r.user_id ?? '')) return false;
        return r.user_id !== userId;
      };

      const decorate = (r: ResponseRow): ResponseNode => {
        const reportParams = new URLSearchParams({
          target_type: 'response',
          target_id: String(r.id),
          category,
          post_id: String(postId),
        });
        const replyParams = new URLSearchParams({
          post_id: String(postId),
          category,
          parent_id: String(r.id),
        });
        return {
          ...r,
          reportHref: '/report?' + reportParams.toString(),
          replyHref: '/respond?' + replyParams.toString(),
          canReply: canReplyTo(r),
          children: all
            .filter((c) => c.parent_id === r.id)
            .map(decorate),
        };
      };

      const topLevel = all.filter((r) => r.parent_id == null).map(decorate);

      setAllResponses(all);
      setPost(postData);
      setTree(topLevel);
      setTopLevelCount(topLevel.length);
      setLoading(false);
    }
    load();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => {
      authSub.subscription.unsubscribe();
    };
  }, [postId, category, refreshKey]);

  useEffect(() => {
    const responsesChannel = supabase
      .channel(`post-${postId}-responses`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          setRefreshKey((k) => k + 1);
        },
      )
      .subscribe();

    const postChannel = supabase
      .channel(`post-${postId}-post`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<Post>;
          setPost((prev) => (prev ? { ...prev, ...updated } : prev));
        },
      )
      .subscribe();

    return () => {
      responsesChannel.unsubscribe();
      postChannel.unsubscribe();
    };
  }, [postId]);

  const hasOwnTopLevel =
    currentUserId != null &&
    allResponses.some((r) => r.parent_id == null && r.user_id === currentUserId);

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
          <a href={notFoundBackHref} className="text-sm text-stone-500 hover:text-stone-700">
            {backLabel}
          </a>
          <p className="text-stone-400 mt-4">Post not found.</p>
        </div>
      </main>
    );
  }

  const isTalker =
    currentUserId != null && post.user_id != null && currentUserId === post.user_id;

  const selectedThread =
    selectedThreadId != null ? tree.find((n) => n.id === selectedThreadId) ?? null : null;

  async function handleReply(skipCrisisCheck = false) {
    setReplyError('');
    if (!selectedThread) return;
    const messages = flattenThread(selectedThread);
    const last = messages[messages.length - 1];
    if (!last || !last.canReply) return;

    const trimmed = replyContent.trim();
    if (!trimmed) {
      setReplyError('Please add a few words.');
      return;
    }
    if (trimmed.length > 1500) {
      setReplyError('Please keep your reply under 1500 characters.');
      return;
    }
    if (!skipCrisisCheck && containsCrisisLanguage(trimmed)) {
      setShowReplyCrisis(true);
      return;
    }

    setReplying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setReplying(false);
      setReplyError('Please sign in to reply.');
      return;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('created_at', oneHourAgo);
    if ((recentCount ?? 0) >= 10) {
      setReplying(false);
      setReplyError("You've been showing up a lot today. Rest a little and come back.");
      return;
    }

    const { error } = await supabase.from('responses').insert({
      content: trimmed,
      post_id: parseInt(postId),
      anonymous: false,
      user_id: user.id,
      parent_id: last.id,
    });

    if (error) {
      console.error(error);
      setReplying(false);
      setReplyError('Could not send your reply right now. Please try again in a moment.');
      return;
    }

    setReplyContent('');
    setShowReplyCrisis(false);
    setReplying(false);
    setRefreshKey((k) => k + 1);
  }

  function setThreadInUrl(id: number | null) {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (id == null) params.delete('thread');
    else params.set('thread', String(id));
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    window.history.pushState(null, '', url);
  }

  function openThread(id: number) {
    setSelectedThreadId(id);
    setThreadInUrl(id);
  }

  function exitChat() {
    setSelectedThreadId(null);
    setReplyContent('');
    setReplyError('');
    setShowReplyCrisis(false);
    setThreadInUrl(null);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {selectedThread ? (
          <ChatView
            post={post}
            thread={selectedThread}
            currentUserId={currentUserId}
            helpedState={helpedState}
            onHelped={handleHelped}
            onBack={exitChat}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            replying={replying}
            replyError={replyError}
            setReplyError={setReplyError}
            showReplyCrisis={showReplyCrisis}
            setShowReplyCrisis={setShowReplyCrisis}
            onReply={handleReply}
          />
        ) : (
          <>
            <a href={backHref} className="text-sm text-stone-500 hover:text-stone-700">
              {backLabel}
            </a>

            <div className="bg-white shadow-card rounded-xl bg-card px-5 py-4 mt-6">
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
              {currentUserId && currentUserId === post.user_id && (
                post.resolved ? (
                  <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Resolved
                  </div>
                ) : (
                  <button
                    onClick={handleMarkResolved}
                    disabled={resolving}
                    className="mt-4 text-xs text-stone-600 border border-stone-300 px-3 py-1.5 rounded-full hover:border-stone-800 hover:text-stone-800 transition-colors disabled:opacity-40"
                  >
                    {resolving ? 'Marking...' : 'Mark as resolved'}
                  </button>
                )
              )}
            </div>

            <div className="mt-4">
              <p className="text-stone-500 text-sm">
                {topLevelCount === 1 ? '1 person' : String(topLevelCount) + ' people'} showed up
              </p>
            </div>

            <div className="space-y-2 mt-4">
              {tree.length > 0 ? (
                tree.map((node) => {
                  const isOwnThread =
                    currentUserId != null && node.user_id === currentUserId;
                  const canOpen = isTalker || isOwnThread;
                  const username = node.anonymous
                    ? 'Anonymous'
                    : (node.profiles?.username ?? 'A member of Kith');
                  const hidePreview = !isTalker && !isOwnThread;
                  const snippet = hidePreview
                    ? 'Responded to this post.'
                    : previewSnippet(node.content, canOpen);
                  return (
                    <button
                      key={node.id}
                      onClick={canOpen ? () => openThread(node.id) : undefined}
                      disabled={!canOpen}
                      className={
                        'w-full text-left bg-white shadow-card rounded-xl bg-card px-5 py-4 transition-colors ' +
                        (canOpen
                          ? 'hover:bg-stone-50 cursor-pointer'
                          : 'cursor-default opacity-90')
                      }
                    >
                      <div className="flex items-baseline justify-between mb-1 gap-2">
                        <p className="text-sm font-medium text-stone-700 truncate">{username}</p>
                        <span className="text-xs text-stone-400 flex-shrink-0">{formatTimestamp(node.created_at)}</span>
                      </div>
                      <p className={'text-sm truncate ' + (hidePreview ? 'text-stone-400 italic' : 'text-stone-500')}>{snippet}</p>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm">Waiting for someone to show up.</p>
                </div>
              )}
            </div>

            {(!currentUserId || (currentUserId !== post.user_id && !hasOwnTopLevel)) && (
              <a href={respondHref} className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors mt-6">
                Respond to this
              </a>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ChatView({
  post,
  thread,
  currentUserId,
  helpedState,
  onHelped,
  onBack,
  replyContent,
  setReplyContent,
  replying,
  replyError,
  setReplyError,
  showReplyCrisis,
  setShowReplyCrisis,
  onReply,
}: {
  post: Post;
  thread: ResponseNode;
  currentUserId: string | null;
  helpedState: Record<number, 'confirm' | 'gone'>;
  onHelped: (id: number) => void;
  onBack: () => void;
  replyContent: string;
  setReplyContent: (v: string) => void;
  replying: boolean;
  replyError: string;
  setReplyError: (v: string) => void;
  showReplyCrisis: boolean;
  setShowReplyCrisis: (v: boolean) => void;
  onReply: (skipCrisisCheck?: boolean) => void | Promise<void>;
}) {
  const messages = flattenThread(thread);
  const last = messages[messages.length - 1];
  const canReply = last?.canReply ?? false;
  const viewerIsTalker =
    currentUserId != null && post.user_id != null && currentUserId === post.user_id;

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');

  function closeReport() {
    setReportTarget(null);
    setReportReason('');
    setReportError('');
    setReportSubmitted(false);
  }

  async function handleReportSubmit() {
    if (!reportTarget || !reportReason || reportSubmitting) return;
    setReportError('');
    setReportSubmitting(true);
    const payload =
      reportTarget.kind === 'response'
        ? { target_type: 'response', target_id: reportTarget.id, reason: reportReason, status: 'open' }
        : { target_type: 'user', target_user_id: reportTarget.userId, reason: reportReason, status: 'open' };
    const { error } = await supabase.from('reports').insert(payload);
    setReportSubmitting(false);
    if (error) {
      console.error(error);
      setReportError('Could not send your report right now. Please try again in a moment.');
      return;
    }
    setReportSubmitted(true);
    setTimeout(closeReport, 1500);
  }
  const otherUsername = viewerIsTalker
    ? (thread.anonymous ? 'Anonymous' : (thread.profiles?.username ?? 'A member of Kith'))
    : (post.anonymous ? 'Anonymous' : (post.profiles?.username ?? 'A member of Kith'));
  const otherUserId = viewerIsTalker ? thread.user_id : post.user_id;
  const canReportOtherUser =
    currentUserId != null && otherUserId != null && otherUserId !== currentUserId;
  const isHelperOwnThread =
    currentUserId != null &&
    thread.user_id === currentUserId &&
    post.user_id !== currentUserId;
  const helped = helpedState[thread.id];
  const waitingOnOther =
    !canReply &&
    currentUserId != null &&
    last != null &&
    last.user_id === currentUserId;

  return (
    <>
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </button>

      <div className="mt-6 mb-5 pb-4 border-b border-stone-200">
        <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Conversation with</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-medium text-stone-700">{otherUsername}</p>
          {canReportOtherUser && (
            <button
              onClick={() =>
                setReportTarget({ kind: 'user', userId: otherUserId!, username: otherUsername })
              }
              className="text-stone-400 hover:text-stone-700 transition-colors p-1 -mr-1"
              aria-label={`Report ${otherUsername}`}
            >
              <FlagIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((m) => {
          const fromViewer = m.user_id != null && m.user_id === currentUserId;
          const username = m.anonymous
            ? 'Anonymous'
            : (m.profiles?.username ?? 'A member of Kith');
          const canReportMessage =
            currentUserId != null && m.user_id != null && m.user_id !== currentUserId;
          return (
            <div
              key={m.id}
              className={
                (fromViewer ? 'flex justify-end' : 'flex justify-start items-center gap-1') +
                ' group'
              }
            >
              <div
                className={
                  'max-w-[80%] px-4 py-3 ' +
                  (fromViewer
                    ? 'bg-stone-800 text-white rounded-2xl rounded-br-md'
                    : 'bg-white shadow-card rounded-2xl rounded-bl-md text-stone-700')
                }
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p
                  className={
                    'text-xs mt-1 ' + (fromViewer ? 'text-stone-300' : 'text-stone-400')
                  }
                >
                  {username} · {formatTimestamp(m.created_at)}
                </p>
              </div>
              {canReportMessage && (
                <button
                  onClick={() => setReportTarget({ kind: 'response', id: m.id })}
                  className="opacity-40 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 text-stone-400 hover:text-stone-700"
                  aria-label="Report this message"
                >
                  <FlagIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isHelperOwnThread && helped !== 'gone' && (
        <div className="mt-3 flex justify-start">
          {helped === 'confirm' ? (
            <p className="text-xs text-stone-400 italic">Glad you showed up.</p>
          ) : (
            <button
              onClick={() => onHelped(thread.id)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              This helped me show up
            </button>
          )}
        </div>
      )}

      {canReply ? (
        showReplyCrisis ? (
          <div className="bg-white shadow-card rounded-xl bg-card px-5 py-4 mt-6">
            <p className="text-sm font-medium text-stone-700 mb-2">One moment before this sends.</p>
            <p className="text-sm text-stone-600 mb-3">
              Some of what you wrote stayed with us. Are you doing okay right now?
            </p>
            <div className="shadow-card rounded-xl bg-card px-4 py-3 mb-3">
              <p className="text-stone-700 text-sm font-medium mb-1">If you want to talk to someone right now</p>
              <p className="text-stone-600 text-sm mb-1">Mentally Aware Nigeria Initiative (MANI) is a free listening line.</p>
              <p className="text-stone-800 text-base font-semibold">{MANI_NUMBER}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReplyCrisis(false)}
                className="flex-1 border border-stone-300 text-stone-700 py-2 rounded-xl text-sm font-medium hover:border-stone-800 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={() => onReply(true)}
                disabled={replying}
                className="flex-1 bg-stone-800 text-white py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {replying ? 'Sending...' : 'Send my reply'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex gap-2 items-end">
              <textarea
                placeholder="Reply with care."
                value={replyContent}
                onChange={(e) => {
                  setReplyContent(e.target.value);
                  if (replyError) setReplyError('');
                }}
                rows={2}
                className="flex-1 bg-white shadow-card rounded-2xl px-4 py-3 text-stone-700 text-base focus:outline-none resize-none"
              />
              <button
                onClick={() => onReply()}
                disabled={replying || replyContent.trim().length === 0}
                className="bg-stone-800 text-white px-5 py-3 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {replying ? 'Sending...' : 'Send'}
              </button>
            </div>
            {replyError && <p className="text-sm text-red-500 mt-2">{replyError}</p>}
          </div>
        )
      ) : waitingOnOther ? (
        <p className="text-xs text-stone-400 italic mt-6 text-center">Waiting for a reply.</p>
      ) : null}

      {reportTarget && (
        <div
          className="fixed inset-0 bg-stone-900/40 flex items-center justify-center px-4 z-50"
          onClick={() => {
            if (!reportSubmitting) closeReport();
          }}
        >
          <div
            className="bg-white rounded-2xl px-5 py-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-stone-800 text-base font-medium mb-1">
              {reportTarget.kind === 'user' ? 'Report user' : 'Report this message'}
            </p>
            <p className="text-stone-500 text-sm mb-4">
              {reportTarget.kind === 'user'
                ? `You are reporting ${reportTarget.username}.`
                : "What's the issue?"}
            </p>
            {reportSubmitted ? (
              <>
                <p className="text-stone-600 text-sm py-6 text-center">Thanks. We&apos;ll review this.</p>
                <button
                  onClick={closeReport}
                  className="w-full bg-stone-800 text-white py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={
                        'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ' +
                        (reportReason === reason
                          ? 'border-stone-400 bg-stone-100 text-stone-800'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-800')
                      }
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeReport}
                    disabled={reportSubmitting}
                    className="flex-1 border border-stone-300 text-stone-700 py-2 rounded-xl text-sm font-medium hover:border-stone-800 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReportSubmit}
                    disabled={!reportReason || reportSubmitting}
                    className="flex-1 bg-stone-800 text-white py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
                  >
                    {reportSubmitting ? 'Sending...' : 'Submit report'}
                  </button>
                </div>
                {reportError && (
                  <p className="text-sm text-red-500 text-center mt-3">{reportError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
