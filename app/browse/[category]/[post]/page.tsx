'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUPPORT_LABELS: Record<string, string> = {
  let_it_out: 'Just let it out',
  encouragement: 'Encouragement',
  perspective: 'Perspective',
  practical_advice: 'Practical advice',
  shared_experience: 'Shared experience',
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ category: string; post: string }>;
}) {
  const { category, post: postId } = await params;
  const categoryName = decodeURIComponent(category).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!post) {
    return (
      <main className="min-h-screen bg-stone-950 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <a href={`/browse/${category}`} className="text-sm text-stone-500 hover:text-stone-300">
            ← Back to {categoryName}
          </a>
          <p className="text-stone-400 mt-4">Post not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href={`/browse/${category}`} className="text-sm text-stone-500 hover:text-stone-300">
          ← Back to {categoryName}
        </a>

        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 mt-6">
          {post.support_type && SUPPORT_LABELS[post.support_type] && (
            <span className="inline-block text-xs font-medium bg-stone-100 text-stone-500 px-2 py-1 rounded-full mb-3">
              Needs: {SUPPORT_LABELS[post.support_type]}
            </span>
          )}
          <p className="text-stone-700 text-base leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-2 mt-3">
            <p className="text-xs text-stone-400">{post.anonymous ? 'Anonymous' : 'A member of Kith'}</p>
            <span className="text-stone-300 text-xs">·</span>
            <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-stone-500 text-sm">
            {(responses?.length ?? 0) === 1 ? '1 person' : `${responses?.length ?? 0} people`} showed up
          </p>
          <p className="text-stone-600 text-xs">· Be the same, show up.</p>
        </div>

        <div className="space-y-3 mt-4">
          {responses && responses.length > 0 ? (
            responses.map((response) => (
              <div key={response.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="text-stone-700 text-base leading-relaxed">{response.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-stone-400">{response.anonymous ? 'Anonymous' : 'A member of Kith'}</p>
                    <span className="text-stone-300 text-xs">·</span>
                    <span className="text-xs text-stone-400">{new Date(response.created_at).toLocaleDateString()}</span>
                  </div>
                  
                    href={`/report?target_type=response&target_id=${response.id}`}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Report
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">Be the first to show up.</p>
            </div>
          )}
        </div>

        
          href={`/respond?post_id=${post.id}&category=${category}`}
          className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors mt-6"
        >
          Respond to this
        </a>
      </div>
    </main>
  );
}
