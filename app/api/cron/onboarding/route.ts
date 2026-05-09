import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/supabase';

const ADMIN_EMAIL = 'anyikwapatrick@gmail.com';
const FROM = 'Kith <hello@kith.support>';
const APP_URL = 'https://kith.support';

const WRAP_OPEN = `<div style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#000000;padding:24px;">`;
const WRAP_CLOSE = `<p style="font-size:13px;color:#888888;margin:32px 0 0;line-height:1.5;">If you no longer want these emails, you can manage your notification settings on Kith.</p></div>`;
const H1 = (s: string) => `<h1 style="font-size:24px;font-weight:700;margin:0 0 16px;">${s}</h1>`;
const P = (s: string, mb = 16) => `<p style="font-size:16px;line-height:1.5;margin:0 0 ${mb}px;">${s}</p>`;
const BTN = (href: string, label: string, mr = 0) =>
  `<a href="${href}" style="display:inline-block;background-color:#000000;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:500;margin-right:${mr}px;">${label}</a>`;

type EmailType = 'day3_nudge' | 'day7_checkin' | 'first_action' | 'first_action_followup';

const TEMPLATES: Record<EmailType, { subject: string; html: string }> = {
  day3_nudge: {
    subject: "Kith is here when you're ready.",
    html:
      WRAP_OPEN +
      H1("Kith is here when you're ready.") +
      P("Some things take time to say out loud. There's no clock here, and no one waiting for you to perform.") +
      P("If today feels like the day, two small ways in:") +
      P(`${BTN(`${APP_URL}`, 'Browse a category', 12)}${BTN(`${APP_URL}`, 'Read what someone is carrying')}`, 24) +
      WRAP_CLOSE,
  },
  first_action: {
    subject: 'You showed up.',
    html:
      WRAP_OPEN +
      H1('You showed up.') +
      P("You either spoke something out loud, or you showed up for someone who did. Both matter. Both are hard.") +
      P('Keep going when you can. Kith is built out of small moments like this one.') +
      BTN(APP_URL, 'Open Kith') +
      WRAP_CLOSE,
  },
  day7_checkin: {
    subject: 'No rush.',
    html:
      WRAP_OPEN +
      H1('No rush.') +
      P("No pressure, and no expectation. Just a quiet note that Kith is still here, whenever you're ready — today, next week, next month.") +
      P("We'll be here.") +
      BTN(APP_URL, 'Open Kith') +
      WRAP_CLOSE,
  },
  first_action_followup: {
    subject: 'Come back when you can.',
    html:
      WRAP_OPEN +
      H1('Come back when you can.') +
      P("You showed up once already — that took something. Whenever you have the energy for another small moment, the community is still here.") +
      BTN(APP_URL, 'Open Kith') +
      WRAP_CLOSE,
  },
};

async function sendEmail(apiKey: string, to: string, type: EmailType) {
  const { subject, html } = TEMPLATES[type];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured.' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!serviceRoleKey || !resendApiKey) {
    return NextResponse.json({ error: 'Cron not configured.' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  type AuthUser = { id: string; email?: string | null; created_at: string };
  const users: AuthUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.email && u.email !== ADMIN_EMAIL) {
        users.push({ id: u.id, email: u.email, created_at: u.created_at });
      }
    }
    if (data.users.length < 1000) break;
  }

  const [postsRes, responsesRes, profilesRes] = await Promise.all([
    admin.from('posts').select('user_id, created_at').not('user_id', 'is', null),
    admin.from('responses').select('user_id, created_at').not('user_id', 'is', null),
    admin.from('profiles').select('id, onboarding_emails'),
  ]);

  if (postsRes.error || responsesRes.error || profilesRes.error) {
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  type Action = { user_id: string; created_at: string };
  const byUser = new Map<string, { count: number; firstAt: number }>();
  const tally = (rows: Action[]) => {
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      const cur = byUser.get(r.user_id);
      if (!cur) byUser.set(r.user_id, { count: 1, firstAt: t });
      else byUser.set(r.user_id, { count: cur.count + 1, firstAt: Math.min(cur.firstAt, t) });
    }
  };
  tally((postsRes.data ?? []) as Action[]);
  tally((responsesRes.data ?? []) as Action[]);

  const sentByUser = new Map<string, Set<EmailType>>();
  for (const p of (profilesRes.data ?? []) as { id: string; onboarding_emails: string[] | null }[]) {
    sentByUser.set(p.id, new Set((p.onboarding_emails ?? []) as EmailType[]));
  }

  const inWindow = (delta: number, target: number) => Math.abs(delta - target) <= HOUR / 2;
  const within = (t: number, ago: number) => now - t <= ago && now - t >= 0;

  const sent: { user_id: string; type: EmailType }[] = [];
  const failed: { user_id: string; type: EmailType }[] = [];

  const trySend = async (user: AuthUser, type: EmailType) => {
    if (sentByUser.get(user.id)?.has(type)) return;
    if (!user.email) return;
    const ok = await sendEmail(resendApiKey, user.email, type);
    if (!ok) {
      failed.push({ user_id: user.id, type });
      return;
    }
    sent.push({ user_id: user.id, type });
    const set = sentByUser.get(user.id) ?? new Set<EmailType>();
    set.add(type);
    sentByUser.set(user.id, set);
    await admin
      .from('profiles')
      .update({ onboarding_emails: Array.from(set) })
      .eq('id', user.id);
  };

  for (const user of users) {
    const signedUp = new Date(user.created_at).getTime();
    const action = byUser.get(user.id);
    const totalActions = action?.count ?? 0;
    const firstAt = action?.firstAt;

    if (totalActions === 0 && inWindow(now - signedUp, 3 * DAY)) {
      await trySend(user, 'day3_nudge');
    }

    if (totalActions === 0 && inWindow(now - signedUp, 7 * DAY)) {
      await trySend(user, 'day7_checkin');
    }

    if (totalActions === 1 && firstAt !== undefined && within(firstAt, DAY)) {
      await trySend(user, 'first_action');
    }

    if (totalActions === 1 && firstAt !== undefined && inWindow(now - firstAt, 2 * DAY)) {
      await trySend(user, 'first_action_followup');
    }
  }

  return NextResponse.json({ ok: true, sent: sent.length, failed: failed.length });
}
