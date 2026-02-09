import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/callback'] as const

export async function middleware(req: NextRequest) {
  // Skip middleware for public API routes
  if (req.nextUrl.pathname.startsWith('/api/public/')) {
    return NextResponse.next()
  }


  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(req.nextUrl.pathname as typeof PUBLIC_PATHS[number])) {
    return res
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) throw sessionError

    if (!session?.user?.email) {
      return redirectToLogin(req)
    }

    // Get user role first since we'll need it for multiple checks
    const { data: userData, error: userRoleError } = await supabase
      .from('crm_users')
      .select('role, is_active')
      .eq('email', session.user.email)
      .single()

    if (userRoleError) throw userRoleError

    if (!userData || !userData.is_active) {
      await supabase.auth.signOut()
      return redirectToLogin(req, 'no_access')
    }

    // Admin route protection - updated logic
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
    const isSuperAdminRoute = req.nextUrl.pathname.startsWith('/super-admin')
    const isAdminUser = userData.role === 'admin'
    const isSuperAdminUser = userData.role === 'super_admin'

    // Super Admin routing
    if (isSuperAdminUser) {
      // Super admin accessing root - redirect to super-admin
      if (req.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/super-admin', req.url))
      }
      // Super admin can access everything except force redirect to super-admin dashboard
      if (!isSuperAdminRoute && !req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/super-admin', req.url))
      }
    }

    // Non-super-admin trying to access super-admin routes
    if (isSuperAdminRoute && !isSuperAdminUser) {
      if (isAdminUser) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return NextResponse.redirect(new URL('/', req.url))
    }

    // If user is admin and tries to access dashboard, redirect to admin
    if (isAdminUser && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    // If non-admin tries to access admin routes, redirect to dashboard
    if (isAdminRoute && !isAdminUser && !isSuperAdminUser) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // If admin tries to access non-admin routes (except API routes), redirect to admin
    if (isAdminUser && !isAdminRoute && !req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    // Check user access
    const { data: user, error: userAccessError } = await supabase
      .from('crm_users')
      .select('is_active')
      .eq('email', session.user.email)
      .single()

    if (userAccessError) throw userAccessError

    if (!user || !user.is_active) {
      await supabase.auth.signOut()
      return redirectToLogin(req, 'no_access')
    }

    // Check for shared access if accessing customer data
    if (req.nextUrl.pathname.startsWith('/customers/')) {
      const customerId = req.nextUrl.pathname.split('/')[2]

      if (customerId) {
        if (!session?.user?.id) return redirectToLogin(req)

        // Check if the user has shared access to this customer
        const { data: sharedAccess, error: sharedError } = await supabase
          .from('shared_access')
          .select('permissions')
          .eq('shared_with_id', session.user.id)
          .single()

        if (sharedError && sharedError.code !== 'PGRST116') {
          console.error('Shared access check error:', sharedError)
          return redirectToLogin(req, 'access_error')
        }
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToLogin(req, 'auth_error')
  }

}

function redirectToLogin(req: NextRequest, error?: string) {
  const redirectUrl = req.nextUrl.clone()
  redirectUrl.pathname = '/login'
  if (error) {
    redirectUrl.searchParams.set('error', error)
  }
  return NextResponse.redirect(redirectUrl)
}

export const config = {
  matcher: [
    '/((?!api/public|_next/static|_next/image|favicon.ico).*)'
  ]
}