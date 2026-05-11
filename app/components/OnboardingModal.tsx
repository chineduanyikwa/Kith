'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kith-onboarded';

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-stone-900/50"
    >
      <div className="max-w-md w-full bg-white rounded-2xl p-6 md:p-8 space-y-5">
        <h2 id="onboarding-title" className="text-2xl font-bold text-stone-800 tracking-tight">
          You&rsquo;re in.
        </h2>
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <p>
            Kith is a peer support community. Real people, real weight, no scripts. You can come here when you&rsquo;re carrying something heavy &mdash; or when you want to show up for someone who is. Most people end up being both.
          </p>
          <p>
            You don&rsquo;t have to choose just one. Helpers can come back as talkers, and talkers can come back as helpers &mdash; whatever you need that day.
          </p>
          <p>A few things to know:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Everything here is pseudonymous &mdash; you&rsquo;re known by your Kith username, not your real name.</li>
            <li>Helpers respond privately &mdash; each conversation stays one-on-one.</li>
            <li>This is not therapy or crisis support. If you or someone else is in danger, please contact a professional.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="w-full min-h-[44px] bg-stone-800 text-white py-3 px-6 rounded-2xl text-base font-medium hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
