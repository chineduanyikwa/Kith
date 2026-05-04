'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 10;

type Report = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: string;
  created_at: string;
  content?: string;
};

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  async function fetchPage(from: number) {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!data) return [];

    return Promise.all(
      data.map(async (report) => {
        const table = report.target_type === 'post' ? 'posts' : 'responses';
        const { data: item } = await supabase
          .from(table)
          .select('content')
          .eq('id', report.target_id)
          .single();
        return { ...report, content: item?.content || '[content not found]' };
      })
    );
  }

  async function loadInitial() {
    const enriched = await fetchPage(0);
    setReports(enriched);
    setHasMore(enriched.length === PAGE_SIZE);
    setLoading(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    const enriched = await fetchPage(reports.length);
    setReports((prev) => [...prev, ...enriched]);
    if (enriched.length < PAGE_SIZE) setHasMore(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  async function dismissReport(reportId: number) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function deleteContent(report: Report) {
    const table = report.target_type === 'post' ? 'posts' : 'responses';
    await supabase.from(table).delete().eq('id', report.target_id);
    await supabase.from('reports').update({ status: 'actioned' }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  }

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
        <p className="text-stone-500 text-sm mb-8">
          {reports.length === 0 ? 'No open reports.' : String(reports.length) + ' open report' + (reports.length === 1 ? '' : 's')}
        </p>

        {reports.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">All clear.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white shadow-card rounded-xl bg-card px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
                    {report.target_type}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-stone-700 text-sm leading-relaxed mb-2">{report.content}</p>
                <p className="text-xs text-stone-400 mb-4">Reason: {report.reason}</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => dismissReport(report.id)}
                    className="flex-1 border border-stone-200 text-stone-600 text-sm py-2 px-4 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => deleteContent(report)}
                    className="flex-1 bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-4 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    Delete content
                  </button>
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
