'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUPPORT_OPTIONS = [
  { value: 'let_it_out', label: 'Just let it out', description: "I don't need advice. I just need to be heard." },
  { value: 'encouragement', label: 'Encouragement', description: "I need someone to remind me I'm not alone." },
  { value: 'perspective', label: 'Perspective', description: "Help me see this differently." },
  { value: 'practical_advice', label: 'Practical advice', description: "I want suggestions on what to do." },
  { value: 'shared_experience', label: 'Shared experience', description: "Has anyone been through something like this?" },
];

const CRISIS_KEYWORDS = [
  'want to die', 'end my life', 'kill myself', 'killing myself',
  'suicide', 'suicidal', 'no reason to live',
  'end it all', 'not worth living', 'better off dead',
];

const MANI = '08091116264';
const MIN_LENGTH = 20;
const MAX_LENGTH = 2000;

function PostForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get('category') || '';
  const categoryDisplay = category
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const [content, setContent] = useState('');
  const [supportType, setSupportType] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCrisisFollowUp, setShowCrisisFollowUp] = useState(false);

  const isCrisis = CRISIS_KEYWORDS.some((kw) => content.toLowerCase().includes(kw));

  function validate() {
    if (content.length < MIN_LENGTH) {
      return 'Please share a little more — at least ' + MIN_LENGTH + ' characters.';
    }
    if (content.length > MAX_LENGTH) {
      return 'Please keep your post under ' + MAX_LENGTH + ' characters.';
    }
    return null;
  }

  async function handleSubmitClick() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    const { error: dbError } = await supabase.from('posts').insert({
      content,
      category,
      anonymous,
      support_type: supportType || null,
    });
    setLoading(false);
    if (dbError) {
      console.error(dbError);
      setError(dbError.message);
    } else if (isCrisis) {
      setShowCrisisFollowUp(true);
    } else {
      router.push('/browse/' + category);
    }
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
            <p className="text-stone-700 text-sm font-medium mb-1">If you need to talk to someone right now</p>
            <p className="text-stone-600 text-sm mb-2">Mentally Aware Nigeria Initiative (MANI) is available to help.</p>
            <p className="text-amber-800 text-base font-semibold">{MANI}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/browse/' + category)}
              className="block w-full bg-stone-800 text-white py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-stone-700 transition-colors"
            >
              I am okay - take me to my post
            </button>
            <button
              onClick={() => { window.location.href = 'tel:' + MANI; }}
              className="block w-full border border-amber-300 text-amber-700 py-3 px-4 rounded-2xl text-sm font-medium text-center hover:bg-amber-50 transition-colors"
            >
              Call MANI now
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="max-w-xl mx-auto">
        <div>
          <a href="/browse?intent=talk" className="text-sm text-stone-500 hover:text-stone-600">
            Back to Categories
          </a>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-stone-800">What's on your heart?</h1>
            {categoryDisplay && (
              <p className="text-medium font-medium text-stone-700">Posting in {categoryDisplay}</p>
            )}
            <p className="text-stone-500 text-sm">This is your space. Say it however it comes.</p>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          <div>
            <label className="text-sm font-medium text-stone-400 block mb-2">Your post</label>
            <textarea
              placeholder="Say what you need to say..."
              rows={6}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-700 text-sm focus:outline-none focus:border-stone-400 resize-none"
            />
            <div className="flex justify-between mt-1">
              {error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-stone-400 ml-auto">{content.length}/{MAX_LENGTH}</p>
            </div>

            {isCrisis && content.length > 0 && (
              <div className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mt-3">
                
                <p className="text-stone-600 text-sm">
                  You do not have to be okay right now. If things feel really dark, please reach out to someone who can help. Mentally Aware Nigeria Initiative (MANI) is a free listening line: <span className="font-semibold">{MANI}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-stone-400 block mb-3">
              What do you need right now? <span className="text-stone-300 font-normal">(optional)</span>
            </label>
            <div className="space-y-2">
              {SUPPORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSupportType(supportType === option.value ? '' : option.value)}
                  className={'w-full text-left py-3 px-4 rounded-xl border transition-colors ' + (
                    supportType === option.value
                      ? 'border-stone-800 bg-white text-stone-800'
                      : 'border-stone-200 hover:border-stone-300'
                  )}
                >
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className={'text-xs mt-0.5 ' + (supportType === option.value ? 'text-stone-300' : 'text-stone-400')}>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-stone-600 text-sm">{anonymous ? 'Anonymous' : 'Your name'}</p>
            <button
              onClick={() => setAnonymous(!anonymous)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              {anonymous ? 'Post as yourself instead' : 'Post anonymously instead'}
            </button>
          </div>

          <button
            onClick={handleSubmitClick}
            disabled={loading}
            className="w-full bg-stone-800 text-white py-4 px-6 rounded-2xl text-base font-medium text-center hover:bg-stone-700 transition-colors disabled:opacity-40"
          >
            {loading ? 'Posting...' : 'Let it out'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PostPage() {
  return (
    <Suspense>
      <PostForm />
    </Suspense>
  );
}
