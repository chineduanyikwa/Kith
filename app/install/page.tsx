'use client';

import { useEffect, useState } from 'react';

type Device = 'unknown' | 'ios' | 'android' | 'mac' | 'windows';
type Section = 'ios' | 'android' | 'chromeDesktop' | 'safariMac';

const ORDER: Record<Device, Section[]> = {
  ios:     ['ios', 'android', 'chromeDesktop', 'safariMac'],
  android: ['android', 'ios', 'chromeDesktop', 'safariMac'],
  mac:     ['safariMac', 'chromeDesktop', 'ios', 'android'],
  windows: ['chromeDesktop', 'safariMac', 'ios', 'android'],
  unknown: ['ios', 'android', 'chromeDesktop', 'safariMac'],
};

export default function InstallPage() {
  const [device, setDevice] = useState<Device>('unknown');

  useEffect(() => {
    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setDevice('ios');
    else if (/Android/.test(ua)) setDevice('android');
    else if (/Macintosh/.test(ua)) setDevice('mac');
    else if (/Windows/.test(ua)) setDevice('windows');
    else setDevice('unknown');
  }, []);

  const sections: Record<Section, React.ReactNode> = {
    ios: (
      <section key="ios" className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">iPhone &amp; iPad (Safari)</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Tap the share button at the bottom of your browser.</li>
          <li>Tap <span className="font-medium">Add to Home Screen</span>.</li>
        </ol>
      </section>
    ),
    android: (
      <section key="android" className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Android (Chrome)</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Tap the three-dot menu in your browser.</li>
          <li>Tap <span className="font-medium">Add to Home Screen</span> or <span className="font-medium">Install app</span>.</li>
        </ol>
      </section>
    ),
    chromeDesktop: (
      <section key="chromeDesktop" className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Chrome on Mac or Windows</h2>
        <p>Click the install icon in the address bar on the right side, then click <span className="font-medium">Install</span>.</p>
      </section>
    ),
    safariMac: (
      <section key="safariMac" className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Safari on Mac</h2>
        <p>Go to <span className="font-medium">File</span> in the menu bar, then click <span className="font-medium">Add to Dock</span>.</p>
      </section>
    ),
  };

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <a href="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors inline-block mb-8">
        ← Back to Home
      </a>
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Install Kith</h1>
      <p className="text-sm text-stone-500 mb-10">Add Kith to your home screen.</p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        {ORDER[device].map((s) => sections[s])}
      </div>
    </div>
  );
}
