import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: 'Notifications not configured.' },
      { status: 500 },
    );
  }

  const html = `<div style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#000000;padding:24px;"><h1 style="font-size:24px;font-weight:700;margin:0 0 16px;">Welcome to Kith</h1><p style="font-size:16px;line-height:1.5;margin:0 0 16px;">You found Kith. That means you're either carrying something heavy, or you want to help someone who is. Either way, you're in the right place.</p><p style="font-size:16px;line-height:1.5;margin:0 0 16px;">Kith is a peer support community — real people showing up for each other. No scripts, no advice unless it's asked for. Just presence.</p><p style="font-size:16px;line-height:1.5;margin:0 0 24px;">If you need to talk, start by choosing a category. If you want to help, browse what people are carrying and show up for one of them. We're glad you're here.</p><a href="https://kith.support" style="display:inline-block;background-color:#000000;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:500;">Open Kith</a><p style="font-size:13px;color:#888888;margin:32px 0 0;line-height:1.5;">If you no longer want these emails, you can manage your notification settings on Kith.</p></div>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Kith <hello@kith.support>',
      to: email,
      subject: 'Welcome to Kith',
      html,
    }),
  });

  if (!emailRes.ok) {
    return NextResponse.json({ error: 'Email send failed.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
