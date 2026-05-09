'use client';

import { useEffect, useState } from 'react';

export default function InstallKithLink() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error iOS Safari non-standard property
        window.navigator.standalone === true,
    );
  }, []);

  if (isStandalone) return null;

  return (
    <>
      <span aria-hidden="true">·</span>
      <a href="/install" className="hover:text-stone-600 transition-colors">Install Kith</a>
    </>
  );
}
