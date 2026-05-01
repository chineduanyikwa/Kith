'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category, post: postId } = use(params);
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const backHref = `/browse/${category}${intent ? `?intent=${intent}` : ''}`;
  const categoryName = decodeURIComponent(category)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const [post, setPost] = useState<Post | null>(null);
  const [tree, setTree] = useState<ResponseNode[]>([]);
  const [topLevelCount, setTopLevelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [respondHref, setRespondHref] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasOwnTopLevel, setHasOwnTopLevel] = useState(false);

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

      setHasOwnTopLevel(
        userId != null && all.some((r) => r.parent_id == null && r.user_id === userId),
      );
      setPost(postData);
      setTree(topLevel);
      setTopLevelCount(topLevel.length);
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
          <a href={backHref} className="text-sm text-stone-500 hover:text-stone-700">
            Back to {categoryName}
          </a>
          <p className="text-stone-400 mt-4">Post not found.</p>
        </div>
      </main>
    );
  }

  const renderNode = (node: ResponseNode, depth: number) => (
    <div key={node.id} className={depth === 0 ? '' : 'mt-3 pl-4 border-l-2 border-stone-200'}>
      <div className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
        <p className="text-stone-700 text-base leading-relaxed">{node.content}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-400">{node.anonymous ? 'Anonymous' : (node.profiles?.username ?? 'A member of Kith')}</p>
            <span className="text-stone-300 text-xs">·</span>
            <span className="text-xs text-stone-400">{new Date(node.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-3">
            {node.canReply && (
              <a href={node.replyHref} className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
                Reply
              </a>
            )}
            <a href={node.reportHref} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              Report
            </a>
          </div>
        </div>
      </div>
      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href={'/browse/' + category} className="text-sm text-stone-500 hover:text-stone-700">
          Back to {categoryName}
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
        </div>

        <div className="mt-4">
          <p className="text-stone-500 text-sm">
            {topLevelCount === 1 ? '1 person' : String(topLevelCount) + ' people'} showed up
          </p>
        </div>

        <div className="space-y-3 mt-4">
          {tree.length > 0 ? (
            tree.map((node) => renderNode(node, 0))
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
      </div>
    </main>
  );
}
