'use client';

import { useEffect, useState } from 'react';

type Device = 'unknown' | 'ios' | 'android' | 'standalone';

export default function InstallPage() {
  const [device, setDevice] = useState<Device>('unknown');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari non-standard property
      window.navigator.standalone === true;
    if (standalone) {
      setDevice('standalone');
      return;
    }
    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setDevice('ios');
    else if (/Android/.test(ua)) setDevice('android');
    else setDevice('unknown');
  }, []);

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <a href="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors inline-block mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Install app</h1>
      <p className="text-sm text-stone-500 mb-10">Add Kith to your home screen.</p>

      {device === 'standalone' ? (
        <div className="space-y-4 text-stone-700 leading-relaxed">
          <p>Kith is already installed on your device.</p>
          <a href="/" className="text-stone-800 underline hover:text-stone-600">
            Back to home
          </a>
        </div>
      ) : (
        <div className="space-y-8 text-stone-700 leading-relaxed">
          {(device === 'ios' || device === 'unknown') && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-stone-800">iPhone &amp; iPad (Safari)</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>Tap the share button at the bottom of your browser.</li>
                <li>Tap <span className="font-medium">Add to Home Screen</span>.</li>
              </ol>
            </section>
          )}
          {(device === 'android' || device === 'unknown') && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-stone-800">Android (Chrome)</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>Tap the three-dot menu in your browser.</li>
                <li>Tap <span className="font-medium">Add to Home Screen</span> or <span className="font-medium">Install app</span>.</li>
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
