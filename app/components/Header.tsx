'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    router.push('/');
  }

  return (
    <header className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 hover:opacity-70 transition-opacity">
        Kith
      </Link>
      {loggedIn && (
        <button
          onClick={handleSignOut}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Sign out
        </button>
      )}
    </header>
  );
}
