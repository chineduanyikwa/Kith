'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kith-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (choice !== 'accepted' && choice !== 'declined') {
      setVisible(true);
    }
  }, []);

  function record(choice: 'accepted' | 'declined') {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white"
    >
      <div className="max-w-[680px] mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-stone-700">
          Kith uses cookies to keep you signed in and improve your experience.
        </p>
        <div className="flex items-center gap-3 sm:shrink-0">
          <button
            type="button"
            onClick={() => record('declined')}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => record('accepted')}
            className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-full hover:bg-stone-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
