'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Grief', 'Relationships', 'Family', 'Work & Career',
  'Loneliness', 'Identity', 'Mental Health', 'Finances',
  'Health', 'Everything Else',
];

const SUPPORT_TYPES = [
  { value: 'let_it_out', label: 'Just let it out' },
  { value: 'encouragement', label: 'Encouragement' },
  { value: 'perspective', label: 'Perspective' },
  { value: 'practical_advice', label: 'Practical advice' },
  { value: 'shared_experience', label: 'Shared experience' },
];

const CRISIS_KEYWORDS = [
  'want to die', 'end my life', 'kill myself', 'killing myself',
  'suicide', 'suicidal', 'no reason to live', "can't go on",
  'cannot go on', "don't want to be here", 'do not want to be here',
  'end it all', 'not worth living', 'better off dead',
];

function detectCrisis(text: string) {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

const MANI_NUMBER = '08091116264';

export default function PostPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialCategory = searchParams ? (searchParams.get("category") || "") : "";
  const [category, setCategory] = useState(initialCategory);
  const [supportType, setSupportType] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSoftCheck, setShowSoftCheck] = useState(false);
  const [showCrisisFollowUp, setShowCrisisFollowUp] = useState(false);
  const [postedCategory, setPostedCategory] = useState('');

  const isCrisis = detectCrisis(content);
  const isValid = content.length >= 20 && content.length <= 2000 && category !== '';

  async function doSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    const slug = category.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, '');
    const { error } = await supabase.from('posts').insert({
      content,
      category: slug,
      anonymous,
      support_type: supportType || null,
    });
    setSubmitting(false);
    if (!error) {
      setPostedCategory(slug);
      if (isCrisis) {
        setShowCrisisFollowUp(true);
      } else {
        router.push('/browse/' + slug);
      }
    }
  }

  function handleSubmitClick() {
    if (!isValid) return;
    setShowSoftCheck(true);
  }

  if (showCrisisFollowUp) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto pt-12">
          <p className="text-stone-800 text-lg font-medium mb-3">Your post has been shared.</p>
          <p className="text-stone-600 text-sm leading-relaxed mb-8">
            Some of what you wrote made us want to check in with you. Are you okay?
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8">
            <p className="text-amber-800 text-sm font-medium mb-1">If you need to talk to someone right now</p>
            <p className="text-amber-700 text-sm mb-2">Mentally Aware Nigeria Initiative (MANI) is available to help.</p>
            <p className="text-amber-800 text-base font-semibold">{MANI_NUMBER}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/browse/' + postedCategory)}
              className="block w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-stone-700 transition-colors"
            >
              I'm okay — take me to my post
            </button>
            <button
              onClick={() => { window.location.href = 'tel:' + MANI_NUMBER; }}
              className="block w-full border border-amber-300 text-amber-700 py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-amber-50 transition-colors"
            >
              Call MANI now
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (showSoftCheck) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-lg mx-auto pt-12 text-center">
          <p className="text-stone-700 text-base mb-8">Does sharing this help you feel less alone?</p>
          <div className="space-y-3">
            <button
              onClick={doSubmit}
              disabled={submitting}
              className="block w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Posting...' : 'Yes, send it'}
            </button>
            <button
              onClick={() => setShowSoftCheck(false)}
              className="block w-full border border-stone-200 text-stone-600 py-3 px-4 rounded-2xl text-sm font-medium hover:bg-stone-100 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href="/" className="text-sm text-stone-500 hover:text-stone-700">← Home</a>

        <h1 className="text-stone-800 text-xl font-medium mt-6 mb-1">Let it out</h1>
        <p className="text-stone-500 text-sm mb-6">This space is for you.</p>

        <div className="mb-4">
          <label className="block text-sm text-stone-600 mb-2">Choose a space</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  category === cat
                    ? 'border-stone-400 bg-stone-100 text-stone-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-stone-600 mb-2">What do you need right now? <span className="text-stone-400">(optional)</span></label>
          <div className="space-y-2">
            {SUPPORT_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSupportType(supportType === st.value ? '' : st.value)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  supportType === st.value
                    ? 'border-stone-400 bg-stone-100 text-stone-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-sm text-stone-600 mb-2">Write it out</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Whatever is on your mind..."
            maxLength={2000}
            rows={6}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 resize-none bg-white"
          />
          <p className="text-xs text-stone-400 text-right mt-1">{content.length}/2000</p>
        </div>

        {isCrisis && content.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-amber-800 text-sm font-medium mb-1">We see you.</p>
            <p className="text-amber-700 text-sm">
              If you're in a dark place right now, you don't have to face it alone. MANI is here to listen: <span className="font-semibold">{MANI_NUMBER}</span>
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setAnonymous(!anonymous)}
            className="flex items-center gap-2 text-sm text-stone-500"
          >
            <div className={`w-8 h-4 rounded-full transition-colors ${anonymous ? 'bg-stone-700' : 'bg-stone-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${anonymous ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            {anonymous ? 'Posting anonymously' : 'Posting as yourself'}
          </button>
        </div>

        {content.length > 0 && content.length < 20 && (
          <p className="text-xs text-stone-400 mb-3">A little more — at least 20 characters.</p>
        )}

        <button
          onClick={handleSubmitClick}
          disabled={!isValid}
          className="block w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Share this
        </button>
      </div>
    </main>
  );
}
