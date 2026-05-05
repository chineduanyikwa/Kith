import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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

  let body: { responseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }
  const responseId =
    typeof body.responseId === 'number' ? body.responseId : NaN;
  if (!Number.isFinite(responseId)) {
    return NextResponse.json({ error: 'Invalid responseId.' }, { status: 400 });
  }

  const { data: resp } = await supabase
    .from('responses')
    .select('id, user_id, parent_id, post_id')
    .eq('id', responseId)
    .single();
  if (!resp || resp.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if (resp.parent_id != null) {
    return NextResponse.json({ ok: true, skipped: 'reply' });
  }

  const { data: post } = await supabase
    .from('posts')
    .select('id, user_id, category')
    .eq('id', resp.post_id)
    .single();
  if (!post) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  if (!post.user_id || post.user_id === user.id) {
    return NextResponse.json({ ok: true, skipped: 'self' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!serviceRoleKey || !resendApiKey) {
    return NextResponse.json(
      { error: 'Notifications not configured.' },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authorData, error: authorError } =
    await admin.auth.admin.getUserById(post.user_id);
  const authorEmail = authorData?.user?.email;
  if (authorError || !authorEmail) {
    return NextResponse.json(
      { error: 'Could not load post author.' },
      { status: 500 },
    );
  }

  const categoryDisplay = post.category
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
  const postUrl = `${request.nextUrl.origin}/browse/${post.category}/${post.id}`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'hello@kith.support',
      to: authorEmail,
      subject: 'Someone showed up for you on Kith',
      html: `<p>Someone responded to your post in <strong>${categoryDisplay}</strong>.</p><p><a href="${postUrl}">Read their response on Kith</a>.</p>`,
    }),
  });

  if (!emailRes.ok) {
    return NextResponse.json({ error: 'Email send failed.' }, { status: 502 });
  }

  return response;
}
