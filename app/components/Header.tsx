'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
      setReady(true);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    router.push('/');
  }

  return (
    <header className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 hover:opacity-70 transition-opacity">
          Kith
        </Link>
        {pathname !== '/' && (
          <nav className="flex items-center gap-4">
            <Link href="/browse?intent=talk" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
              I need to talk
            </Link>
            <Link href="/browse?intent=help" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
              I want to help
            </Link>
          </nav>
        )}
      </div>
      {!ready ? (
        <div className="w-32 h-8" />
      ) : loggedIn ? (
        <button
          onClick={handleSignOut}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Sign out
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/auth?tab=signup" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Sign up
          </Link>
          <Link href="/auth?tab=login" className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-full hover:bg-stone-700 transition-colors">
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
