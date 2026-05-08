import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseUrl, supabaseKey } from '@/lib/supabase'

const ADMIN_EMAIL = 'anyikwapatrick@gmail.com'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (request.nextUrl.pathname.startsWith('/browse')) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('banned, suspended_until')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.banned) {
        await supabase.auth.signOut()
        const authUrl = new URL('/auth', request.url)
        authUrl.searchParams.set('error', 'Your account has been permanently banned.')
        return NextResponse.redirect(authUrl)
      }
      if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
        await supabase.auth.signOut()
        const until = new Date(profile.suspended_until).toLocaleString()
        const authUrl = new URL('/auth', request.url)
        authUrl.searchParams.set('error', `Your account is suspended until ${until}.`)
        return NextResponse.redirect(authUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
