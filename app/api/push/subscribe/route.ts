import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: { endpoint?: unknown; p256dh?: unknown; auth?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body.p256dh === 'string' ? body.p256dh : '';
  const auth = typeof body.auth === 'string' ? body.auth : '';
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Push not configured.' },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth },
      { onConflict: 'user_id,endpoint' },
    );

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTags({ route: 'api/push/subscribe', op: 'upsert', table: 'push_subscriptions' });
      Sentry.captureException(error);
    });
    return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 });
  }

  return response;
}
