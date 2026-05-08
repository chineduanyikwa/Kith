import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authorizeAdmin } from '@/lib/admin-route';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { target_type?: unknown; target_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const targetType = body.target_type;
  const targetId = body.target_id;

  if (
    (targetType !== 'post' && targetType !== 'response') ||
    typeof targetId !== 'number' ||
    !Number.isFinite(targetId)
  ) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const table = targetType === 'post' ? 'posts' : 'responses';
  const { error: deleteError } = await auth.admin
    .from(table)
    .delete()
    .eq('id', targetId);
  if (deleteError) {
    Sentry.withScope((scope) => {
      scope.setTags({ route: 'api/admin/delete', op: 'delete', table });
      scope.setContext('supabase', { targetId });
      Sentry.captureException(deleteError);
    });
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }

  const { error: reportError } = await auth.admin
    .from('reports')
    .update({ status: 'actioned' })
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  if (reportError) {
    Sentry.withScope((scope) => {
      scope.setTags({ route: 'api/admin/delete', op: 'update', table: 'reports' });
      scope.setContext('supabase', { targetType, targetId });
      Sentry.captureException(reportError);
    });
    return NextResponse.json({ error: 'Report update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
