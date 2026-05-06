import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/';
  const next =
    requestedNext === '/auth' || requestedNext.startsWith('/auth/')
      ? '/'
      : requestedNext;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?tab=login`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth?tab=login`);
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!existing) {
    const pendingUsername = (data.user.user_metadata?.username as string | undefined)?.trim();
    if (pendingUsername) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: pendingUsername,
      });
      if (data.user.email) {
        await fetch(`${origin}/api/notifications/welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.user.email }),
        }).catch(() => {});
      }
    }
  }

  return response;
}
