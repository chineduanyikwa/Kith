import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { authorizeAdmin } from '@/lib/admin-route';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { report_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const reportId = body.report_id;
  if (typeof reportId !== 'number' || !Number.isFinite(reportId)) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { error } = await auth.admin
    .from('reports')
    .update({ status: 'dismissed' })
    .eq('id', reportId);
  if (error) {
    Sentry.withScope((scope) => {
      scope.setTags({ route: 'api/admin/dismiss', op: 'update', table: 'reports' });
      scope.setContext('supabase', { reportId });
      Sentry.captureException(error);
    });
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
