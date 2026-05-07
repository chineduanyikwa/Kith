'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 10;

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
};

type TargetFilter = 'all' | 'post' | 'response' | 'user';

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<TargetFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [threadCache, setThreadCache] = useState<Record<number, ThreadItem[]>>({});
  const [threadLoadingId, setThreadLoadingId] = useState<number | null>(null);

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
            .select('username')
            .eq('id', report.target_user_id)
            .single();
          return { ...report, username: profile?.username ?? null };
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
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function deleteContent(report: Report) {
    if (report.target_type === 'user' || report.target_id == null) return;
    const table = report.target_type === 'post' ? 'posts' : 'responses';
    await supabase.from(table).delete().eq('id', report.target_id);
    await supabase.from('reports').update({ status: 'actioned' }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  }

  async function toggleHidden(report: Report) {
    if (report.target_type === 'user' || report.target_id == null) return;
    const table = report.target_type === 'post' ? 'posts' : 'responses';
    const next = !(report.hidden ?? false);
    const { error } = await supabase
      .from(table)
      .update({ hidden: next })
      .eq('id', report.target_id);
    if (error) return;
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

  if (loading) {
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
        <h1 className="text-stone-800 text-xl font-medium mb-1">Moderation</h1>
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
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                {report.target_type === 'user' ? (
                  <>
                    <p className="text-stone-700 text-sm leading-relaxed mb-2">
                      @{report.username ?? '[user not found]'}
                    </p>
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

                <div className="flex gap-3">
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
      </div>
    </main>
  );
}
