import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-route';

type Action = 'ban' | 'suspend_7' | 'suspend_30' | 'unban';

const ACTIONS: ReadonlySet<Action> = new Set([
  'ban',
  'suspend_7',
  'suspend_30',
  'unban',
]);

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { user_id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const userId = body.user_id;
  const action = body.action;

  if (
    typeof userId !== 'string' ||
    !userId ||
    typeof action !== 'string' ||
    !ACTIONS.has(action as Action)
  ) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  let update: { banned?: boolean; suspended_until?: string | null };
  switch (action as Action) {
    case 'ban':
      update = { banned: true };
      break;
    case 'suspend_7':
      update = {
        suspended_until: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      break;
    case 'suspend_30':
      update = {
        suspended_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      break;
    case 'unban':
      update = { banned: false, suspended_until: null };
      break;
  }

  const { error } = await auth.admin
    .from('profiles')
    .update(update)
    .eq('id', userId);
  if (error) {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
