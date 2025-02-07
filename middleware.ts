import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Paths that should skip auth check
  const publicPaths = ['/login', '/auth/callback']
  if (publicPaths.includes(req.nextUrl.pathname)) {
    return res
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, redirect to login
  if (!session?.user?.email) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // For admin routes, check if user is admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: user } = await supabase
      .from('crm_users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (!user || user.role !== 'admin') {
      // Redirect non-admin users to login
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('error', 'admin_required')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Check if user exists in crm_users
  const { data: user } = await supabase
    .from('crm_users')
    .select('is_active')
    .eq('email', session.user.email)
    .single()

  if (!user || !user.is_active) {
    // Sign out the user if they don't have access
    await supabase.auth.signOut()
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'no_access')
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 