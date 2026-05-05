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

  const userId = user.id;

  const RETRYABLE_DELETE_ERROR =
    'Could not delete your account right now. Please try again in a moment.';

  const { error: respError } = await supabase
    .from('responses')
    .delete()
    .eq('user_id', userId);
  if (respError) {
    console.error('account delete: responses', respError);
    return NextResponse.json({ error: RETRYABLE_DELETE_ERROR }, { status: 500 });
  }

  const { error: postsError } = await supabase
    .from('posts')
    .delete()
    .eq('user_id', userId);
  if (postsError) {
    console.error('account delete: posts', postsError);
    return NextResponse.json({ error: RETRYABLE_DELETE_ERROR }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  if (profileError) {
    console.error('account delete: profile', profileError);
    return NextResponse.json({ error: RETRYABLE_DELETE_ERROR }, { status: 500 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          'Account deletion is not fully configured. Please contact support.',
      },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return NextResponse.json(
      { error: 'Could not delete auth account. Please contact support.' },
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  return response;
}
