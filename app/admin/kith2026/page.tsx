'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatWAT } from '@/lib/time';

const PAGE_SIZE = 10;
const BROWSE_PAGE_SIZE = 20;

type ThreadItem = {
  id: number;
  kind: 'post' | 'response';
  content: string;
};

type Report = {
  id: number;
  target_type: string;
  target_id: number | null;
  target_user_id?: string | null;
  reason: string;
  status: string;
  created_at: string;
  content?: string;
  username?: string | null;
  hidden?: boolean;
  banned?: boolean;
  suspended_until?: string | null;
};

type TargetFilter = 'all' | 'post' | 'response' | 'user';

type Tab = 'reports' | 'browse';
type BrowseFilter = 'all' | 'post' | 'response';

type BrowsePostItem = {
  kind: 'post';
  id: number;
  content: string;
  category: string;
  username: string | null;
  created_at: string;
};

type BrowseResponseItem = {
  kind: 'response';
  id: number;
  content: string;
  post_id: number;
  post_category: string;
  post_preview: string;
  username: string | null;
  created_at: string;
};

type BrowseItem = BrowsePostItem | BrowseResponseItem;

function formatCategory(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<TargetFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [threadCache, setThreadCache] = useState<Record<number, ThreadItem[]>>({});
  const [threadLoadingId, setThreadLoadingId] = useState<number | null>(null);

  const [browseItems, setBrowseItems] = useState<BrowseItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>('all');

  async function fetchPage(from: number, currentFilter: TargetFilter) {
    let query = supabase
      .from('reports')
      .select('*')
      .eq('status', 'open');
    if (currentFilter !== 'all') {
      query = query.eq('target_type', currentFilter);
    }
    const { data } = await query
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!data) return [];

    return Promise.all(
      data.map(async (report) => {
        if (report.target_type === 'user') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, banned, suspended_until')
            .eq('id', report.target_user_id)
            .single();
          return {
            ...report,
            username: profile?.username ?? null,
            banned: profile?.banned ?? false,
            suspended_until: profile?.suspended_until ?? null,
          };
        }
        const table = report.target_type === 'post' ? 'posts' : 'responses';
        const { data: item } = await supabase
          .from(table)
          .select('content, hidden')
          .eq('id', report.target_id)
          .single();
        return {
          ...report,
          content: item?.content || '[content not found]',
          hidden: item?.hidden ?? false,
        };
      })
    );
  }

  async function loadInitial(currentFilter: TargetFilter) {
    setLoading(true);
    const enriched = await fetchPage(0, currentFilter);
    setReports(enriched);
    setHasMore(enriched.length === PAGE_SIZE);
    setLoading(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    const enriched = await fetchPage(reports.length, filter);
    setReports((prev) => [...prev, ...enriched]);
    if (enriched.length < PAGE_SIZE) setHasMore(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadInitial(filter);
  }, [filter]);

  async function fetchBrowsePage(cursor: string | null, currentFilter: BrowseFilter) {
    const wantPosts = currentFilter !== 'response';
    const wantResponses = currentFilter !== 'post';

    type PostRow = {
      id: number;
      content: string;
      category: string;
      anonymous: boolean;
      created_at: string;
      profiles: { username: string | null } | { username: string | null }[] | null;
    };
    type ResponseRow = {
      id: number;
      content: string;
      post_id: number;
      anonymous: boolean;
      created_at: string;
      profiles: { username: string | null } | { username: string | null }[] | null;
    };

    const postsPromise: Promise<PostRow[]> = wantPosts
      ? (async () => {
          let q = supabase
            .from('posts')
            .select('id, content, category, anonymous, created_at, profiles!posts_user_id_profiles_fkey(username)')
            .order('created_at', { ascending: false })
            .limit(BROWSE_PAGE_SIZE);
          if (cursor) q = q.lt('created_at', cursor);
          const { data } = await q;
          return (data ?? []) as PostRow[];
        })()
      : Promise.resolve([]);

    const responsesPromise: Promise<ResponseRow[]> = wantResponses
      ? (async () => {
          let q = supabase
            .from('responses')
            .select('id, content, post_id, anonymous, created_at, profiles!responses_user_id_profiles_fkey(username)')
            .order('created_at', { ascending: false })
            .limit(BROWSE_PAGE_SIZE);
          if (cursor) q = q.lt('created_at', cursor);
          const { data } = await q;
          return (data ?? []) as ResponseRow[];
        })()
      : Promise.resolve([]);

    const [posts, responses] = await Promise.all([postsPromise, responsesPromise]);

    const respPostIds = Array.from(new Set(responses.map((r) => r.post_id)));
    const postLookup = new Map<number, { category: string; content: string }>();
    if (respPostIds.length) {
      const { data: refPosts } = await supabase
        .from('posts')
        .select('id, category, content')
        .in('id', respPostIds);
      for (const p of refPosts ?? []) {
        postLookup.set(p.id, { category: p.category, content: p.content });
      }
    }

    const usernameOf = (
      anonymous: boolean,
      profiles: { username: string | null } | { username: string | null }[] | null,
    ): string | null => {
      if (anonymous) return null;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return profile?.username ?? null;
    };

    const merged: BrowseItem[] = [
      ...posts.map<BrowsePostItem>((p) => ({
        kind: 'post',
        id: p.id,
        content: p.content,
        category: p.category,
        username: usernameOf(p.anonymous, p.profiles),
        created_at: p.created_at,
      })),
      ...responses.map<BrowseResponseItem>((r) => {
        const ref = postLookup.get(r.post_id);
        return {
          kind: 'response',
          id: r.id,
          content: r.content,
          post_id: r.post_id,
          post_category: ref?.category ?? '',
          post_preview: ref?.content ?? '[post not found]',
          username: usernameOf(r.anonymous, r.profiles),
          created_at: r.created_at,
        };
      }),
    ];

    merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const sliced = merged.slice(0, BROWSE_PAGE_SIZE);
    const exhausted =
      (wantPosts ? posts.length < BROWSE_PAGE_SIZE : true) &&
      (wantResponses ? responses.length < BROWSE_PAGE_SIZE : true);
    return { items: sliced, exhausted };
  }

  async function loadBrowseInitial(currentFilter: BrowseFilter) {
    setBrowseLoading(true);
    const { items, exhausted } = await fetchBrowsePage(null, currentFilter);
    setBrowseItems(items);
    setBrowseHasMore(items.length === BROWSE_PAGE_SIZE && !exhausted);
    setBrowseLoading(false);
  }

  async function loadBrowseMore() {
    if (browseItems.length === 0) return;
    setBrowseLoadingMore(true);
    const cursor = browseItems[browseItems.length - 1].created_at;
    const { items, exhausted } = await fetchBrowsePage(cursor, browseFilter);
    setBrowseItems((prev) => [...prev, ...items]);
    if (items.length < BROWSE_PAGE_SIZE || exhausted) setBrowseHasMore(false);
    setBrowseLoadingMore(false);
  }

  useEffect(() => {
    if (tab === 'browse') {
      loadBrowseInitial(browseFilter);
    }
  }, [tab, browseFilter]);

  async function loadThread(report: Report) {
    if (report.target_type !== 'response' || report.target_id == null) return;
    if (threadCache[report.id]) {
      setExpandedId((prev) => (prev === report.id ? null : report.id));
      return;
    }
    setThreadLoadingId(report.id);
    const { data: response } = await supabase
      .from('responses')
      .select('post_id')
      .eq('id', report.target_id)
      .single();
    if (!response) {
      setThreadLoadingId(null);
      return;
    }
    const [{ data: post }, { data: siblings }] = await Promise.all([
      supabase.from('posts').select('id, content').eq('id', response.post_id).single(),
      supabase
        .from('responses')
        .select('id, content, created_at')
        .eq('post_id', response.post_id)
        .order('created_at', { ascending: true }),
    ]);
    const items: ThreadItem[] = [];
    if (post) items.push({ id: post.id, kind: 'post', content: post.content });
    (siblings ?? []).forEach((r) => items.push({ id: r.id, kind: 'response', content: r.content }));
    setThreadCache((prev) => ({ ...prev, [report.id]: items }));
    setExpandedId(report.id);
    setThreadLoadingId(null);
  }

  async function dismissReport(reportId: number) {
    const res = await fetch('/api/admin/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId }),
    });
    if (!res.ok) return;
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function deleteContent(report: Report) {
    if (report.target_type === 'user' || report.target_id == null) return;
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: report.target_type,
        target_id: report.target_id,
      }),
    });
    if (!res.ok) return;
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  }

  async function suspendUser(report: Report, days: 7 | 30) {
    if (report.target_type !== 'user' || !report.target_user_id) return;
    const action = days === 7 ? 'suspend_7' : 'suspend_30';
    const res = await fetch('/api/admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: report.target_user_id, action }),
    });
    if (!res.ok) return;
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id ? { ...r, suspended_until: until } : r,
      ),
    );
  }

  async function banUser(report: Report) {
    if (report.target_type !== 'user' || !report.target_user_id) return;
    const res = await fetch('/api/admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: report.target_user_id, action: 'ban' }),
    });
    if (!res.ok) return;
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, banned: true } : r)),
    );
  }

  async function toggleHidden(report: Report) {
    if (report.target_type === 'user' || report.target_id == null) return;
    const next = !(report.hidden ?? false);
    const res = await fetch('/api/admin/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: report.target_type,
        target_id: report.target_id,
        hidden: next,
      }),
    });
    if (!res.ok) return;
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, hidden: next } : r)),
    );
  }

  const FILTER_OPTIONS: { value: TargetFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'post', label: 'Posts' },
    { value: 'response', label: 'Responses' },
    { value: 'user', label: 'Users' },
  ];

  const BROWSE_FILTER_OPTIONS: { value: BrowseFilter; label: string }[] = [
    { value: 'all', label: 'Posts & responses' },
    { value: 'post', label: 'Posts only' },
    { value: 'response', label: 'Responses only' },
  ];

  const TABS: { value: Tab; label: string }[] = [
    { value: 'reports', label: 'Reports' },
    { value: 'browse', label: 'Browse all content' },
  ];

  if (tab === 'reports' && loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-stone-500 text-sm">Loading reports...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-stone-800 text-xl font-medium mb-4">Moderation</h1>

        <div className="flex border-b border-stone-200 mb-6">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
                tab === t.value
                  ? 'border-stone-800 text-stone-800'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'browse' ? (
          <>
            <p className="text-stone-500 text-sm mb-4">
              {browseLoading
                ? 'Loading…'
                : browseItems.length === 0
                ? 'No content yet.'
                : 'Newest first.'}
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {BROWSE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBrowseFilter(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    browseFilter === opt.value
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {browseLoading ? null : browseItems.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-stone-400 text-sm">Nothing here yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {browseItems.map((item) => {
                  const key = `${item.kind}-${item.id}`;
                  if (item.kind === 'post') {
                    const href = `/browse/${item.category}/${item.id}`;
                    return (
                      <div key={key} className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
                            post · {formatCategory(item.category)}
                          </span>
                          <span className="text-xs text-stone-400">
                            {formatWAT(item.created_at)}
                          </span>
                        </div>
                        <p className="text-stone-700 text-sm leading-relaxed mb-2 line-clamp-3">
                          {item.content}
                        </p>
                        <p className="text-xs text-stone-400 mb-3">
                          {item.username ? '@' + item.username : 'Anonymous'}
                        </p>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-stone-600 underline hover:text-stone-800"
                        >
                          View on site →
                        </a>
                      </div>
                    );
                  }
                  const postHref = item.post_category
                    ? `/browse/${item.post_category}/${item.post_id}`
                    : null;
                  return (
                    <div key={key} className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
                          response
                        </span>
                        <span className="text-xs text-stone-400">
                          {formatWAT(item.created_at)}
                        </span>
                      </div>
                      <p className="text-stone-700 text-sm leading-relaxed mb-2 line-clamp-3">
                        {item.content}
                      </p>
                      <p className="text-xs text-stone-400 mb-3">
                        {item.username ? '@' + item.username : 'Anonymous'}
                      </p>
                      <div className="border-l-2 border-stone-200 pl-3 mb-3">
                        <p className="text-[10px] uppercase tracking-wide text-stone-400 mb-1">
                          on post{item.post_category ? ' · ' + formatCategory(item.post_category) : ''}
                        </p>
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                          {item.post_preview}
                        </p>
                      </div>
                      {postHref && (
                        <a
                          href={postHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-stone-600 underline hover:text-stone-800"
                        >
                          View on site →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {browseHasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadBrowseMore}
                  disabled={browseLoadingMore}
                  className="text-sm text-stone-600 border border-stone-200 bg-white px-5 py-2 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {browseLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
        <p className="text-stone-500 text-sm mb-4">
          {reports.length === 0 ? 'No open reports.' : String(reports.length) + ' open report' + (reports.length === 1 ? '' : 's')}
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === opt.value
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">All clear.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
                      {report.target_type}
                    </span>
                    {report.target_type !== 'user' && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          report.hidden
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {report.hidden ? 'hidden' : 'visible'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">
                    {formatWAT(report.created_at)}
                  </span>
                </div>

                {report.target_type === 'user' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-stone-700 text-sm leading-relaxed">
                        @{report.username ?? '[user not found]'}
                      </p>
                      {report.banned ? (
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Banned
                        </span>
                      ) : report.suspended_until &&
                        new Date(report.suspended_until) > new Date() ? (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Suspended until {formatWAT(report.suspended_until)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-stone-400 mb-4">Reason: {report.reason}</p>
                    {report.username && (
                      <a
                        href={`/profile/${report.username}`}
                        className="inline-block text-xs text-stone-600 underline hover:text-stone-800 mb-4"
                      >
                        View profile →
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-stone-700 text-sm leading-relaxed mb-2">{report.content}</p>
                    <p className="text-xs text-stone-400 mb-4">Reason: {report.reason}</p>
                    {report.target_type === 'response' && (
                      <button
                        onClick={() => loadThread(report)}
                        className="text-xs text-stone-600 underline hover:text-stone-800 mb-4"
                      >
                        {threadLoadingId === report.id
                          ? 'Loading thread…'
                          : expandedId === report.id
                          ? 'Hide thread'
                          : 'View full thread'}
                      </button>
                    )}
                    {expandedId === report.id && threadCache[report.id] && (
                      <div className="border-l-2 border-stone-200 pl-3 mb-4 space-y-2">
                        {threadCache[report.id].map((item) => {
                          const isReported =
                            item.kind === 'response' && item.id === report.target_id;
                          return (
                            <div
                              key={`${item.kind}-${item.id}`}
                              className={`text-xs leading-relaxed rounded px-2 py-1.5 ${
                                isReported
                                  ? 'bg-amber-50 text-stone-800 border border-amber-200'
                                  : item.kind === 'post'
                                  ? 'bg-stone-50 text-stone-700'
                                  : 'text-stone-600'
                              }`}
                            >
                              <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">
                                {item.kind}
                                {isReported ? ' · reported' : ''}
                              </span>
                              {item.content}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => dismissReport(report.id)}
                    className="flex-1 border border-stone-200 text-stone-600 text-sm py-2 px-4 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Dismiss
                  </button>
                  {report.target_type !== 'user' && (
                    <>
                      <button
                        onClick={() => toggleHidden(report)}
                        className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 text-sm py-2 px-4 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        {report.hidden ? 'Unhide' : 'Hide'}
                      </button>
                      <button
                        onClick={() => deleteContent(report)}
                        className="flex-1 bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-4 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Delete content
                      </button>
                    </>
                  )}
                  {report.target_type === 'user' && (
                    <>
                      <button
                        onClick={() => suspendUser(report, 7)}
                        className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 text-sm py-2 px-4 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        Suspend 7 days
                      </button>
                      <button
                        onClick={() => suspendUser(report, 30)}
                        className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 text-sm py-2 px-4 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        Suspend 30 days
                      </button>
                      <button
                        onClick={() => banUser(report)}
                        className="flex-1 bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-4 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Ban permanently
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm text-stone-600 border border-stone-200 bg-white px-5 py-2 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </main>
  );
}
