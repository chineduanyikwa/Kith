'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/lib/supabase';

const REPORT_REASONS = [
  'Harmful advice',
  'Judgment or shaming',
  'Abuse or insults',
  'Sexual or inappropriate content',
  'Manipulative behavior',
  'Spam or irrelevant',
  'Something else',
];

function ReportForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const target_type = searchParams.get('target_type') || 'response';
  const target_id = searchParams.get('target_id');
  const category = searchParams.get('category') || '';
  const post_id = searchParams.get('post_id') || '';

  const [selectedReason, setSelectedReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!selectedReason || !target_id) return;
    setError('');
    setSubmitting(true);
    const { error: dbError } = await supabase.from('reports').insert({
      target_type,
      target_id: parseInt(target_id),
      reason: selectedReason,
      status: 'open',
    });
    setSubmitting(false);
    if (dbError) {
      console.error(dbError);
      Sentry.withScope((scope) => {
        scope.setTags({ page: 'report', op: 'insert', table: 'reports', target_type });
        scope.setContext('supabase', { target_id });
        Sentry.captureException(dbError);
      });
      setError('Could not send your report right now. Please try again in a moment.');
      return;
    }
    setSubmitted(true);
  }

  function handleBack() {
    if (category && post_id) {
      router.push('/browse/' + category + '/' + post_id);
    } else {
      router.back();
    }
  }

  if (submitted) {
    const hasPost = Boolean(category && post_id);
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-6 md:py-10 flex flex-col justify-center">
        <div className="max-w-lg mx-auto w-full text-center">
          <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center mx-auto mb-6 text-xl">
            ✓
          </div>
          <h1 className="text-stone-800 text-lg font-medium mb-3">Report received</h1>
          <p className="text-stone-600 text-sm mb-10 leading-relaxed">
            Thanks for letting us know. We'll review this and take action if it violates our community guidelines.
          </p>
          <button
            onClick={handleBack}
            className="block w-full min-h-[44px] bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors mb-4"
          >
            {hasPost ? 'Back to post' : 'Back to browsing'}
          </button>
          {hasPost && (
            <button
              onClick={() => router.push('/browse')}
              className="text-stone-500 text-sm underline hover:text-stone-700"
            >
              Back to browsing
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 md:py-10">
      <div className="max-w-lg mx-auto">
        <button
          onClick={handleBack}
          className="inline-flex items-center min-h-[44px] text-stone-500 text-sm mb-4 md:mb-8 hover:text-stone-700 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-stone-800 text-xl md:text-2xl font-medium mb-2">Report this response</h1>
        <p className="text-stone-500 text-sm mb-8">What's the issue?</p>

        <div className="space-y-3 mb-8">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                selectedReason === reason
                  ? 'border-stone-400 bg-stone-100 text-stone-800'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-800'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedReason || submitting}
          className="w-full min-h-[44px] bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Submit report'}
        </button>

        {error && (
          <p className="text-sm text-red-500 text-center mt-3">{error}</p>
        )}
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  );
}
