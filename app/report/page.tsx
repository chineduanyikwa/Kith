'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto text-center pt-20">
          <p className="text-stone-700 text-lg mb-2">Thank you for flagging this.</p>
          <p className="text-stone-500 text-sm mb-8">We'll review it and take action if needed.</p>
          <button
            onClick={handleBack}
            className="text-stone-400 text-sm underline hover:text-stone-600"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={handleBack}
          className="text-stone-500 text-sm mb-8 hover:text-stone-700 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-stone-800 text-xl font-medium mb-2">Report this response</h1>
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
          className="w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
