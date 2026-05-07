import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';

const ADMIN_EMAIL = 'anyikwapatrick@gmail.com';

type AuthResult =
  | { ok: true; admin: SupabaseClient }
  | { ok: false; response: NextResponse };

export async function authorizeAdmin(request: NextRequest): Promise<AuthResult> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Admin actions are not configured.' },
        { status: 500 },
      ),
    };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: () => {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, admin };
}
