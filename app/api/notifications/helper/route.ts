import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { supabaseUrl } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let body: { category?: unknown; postId?: unknown; authorUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }
  const category = typeof body.category === 'string' ? body.category : '';
  const postId = typeof body.postId === 'number' ? body.postId : NaN;
  const authorUserId =
    typeof body.authorUserId === 'string' ? body.authorUserId : '';

  if (!category || !Number.isFinite(postId) || !authorUserId) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
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

  const { data: usersData, error: usersError } =
    await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) {
    Sentry.withScope((scope) => {
      scope.setTags({ route: 'api/notifications/helper', op: 'auth.listUsers' });
      scope.setContext('supabase', { category, postId });
      Sentry.captureException(usersError);
    });
    return NextResponse.json(
      { error: 'Could not load users.' },
      { status: 500 },
    );
  }
  const recipients = usersData.users
    .filter((u) => u.id !== authorUserId && u.email)
    .map((u) => u.email as string);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no recipients' });
  }

  const categoryDisplay = category
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
  const postUrl = `https://kith.support/browse/${category}/${postId}`;
  const subject = `Someone needs a voice in ${categoryDisplay}`;
  const from = 'Kith <hello@kith.support>';

  const html = `<div style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#000000;padding:24px;"><h1 style="font-size:24px;font-weight:700;margin:0 0 16px;">Someone needs a voice in ${categoryDisplay}</h1><p style="font-size:16px;line-height:1.5;margin:0 0 16px;">Someone in the ${categoryDisplay} circle just shared something heavy. If you have something to offer — presence, a word, your own experience — this might be the moment.</p><p style="font-size:16px;line-height:1.5;margin:0 0 24px;">You don't have to have the right words. You just have to show up.</p><a href="${postUrl}" style="display:inline-block;background-color:#000000;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:500;">Show up</a><p style="font-size:13px;color:#888888;margin:32px 0 0;line-height:1.5;">If you no longer want these emails, you can manage your notification settings on Kith.</p></div>`;

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const batchBody = chunk.map((to) => ({ from, to, subject, html }));
    const batchRes = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchBody),
    });
    if (!batchRes.ok) {
      return NextResponse.json(
        { error: 'Email send failed.' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
