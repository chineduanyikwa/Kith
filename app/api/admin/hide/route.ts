import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-route';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { target_type?: unknown; target_id?: unknown; hidden?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const targetType = body.target_type;
  const targetId = body.target_id;
  const hidden = body.hidden;

  if (
    (targetType !== 'post' && targetType !== 'response') ||
    typeof targetId !== 'number' ||
    !Number.isFinite(targetId) ||
    typeof hidden !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const table = targetType === 'post' ? 'posts' : 'responses';
  const { error } = await auth.admin
    .from(table)
    .update({ hidden })
    .eq('id', targetId);
  if (error) {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
