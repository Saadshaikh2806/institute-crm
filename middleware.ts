import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/callback'] as const

let hasInitialized = false;

async function triggerEmailAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/public/daily-tasks', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
      }
    });
    console.log('Email API triggered:', await response.text());
  } catch (error) {
    console.error('Failed to trigger email API:', error);
  }
}

function startPeriodicEmails() {
  // Trigger immediately
  triggerEmailAPI();
  
  // Then every 30 seconds
  setInterval(triggerEmailAPI, 30000);
}

export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'development' && !hasInitialized) {
    hasInitialized = true;
    console.log('Development server started - initializing email triggers');
    startPeriodicEmails();
  }

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

    // Admin route protection
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const { data: user, error: userError } = await supabase
        .from('crm_users')
        .select('role')
        .eq('email', session.user.email)
        .single()

      if (userError) throw userError

      if (!user || user.role !== 'admin') {
        return redirectToLogin(req, 'admin_required')
      }
    }

    // Check user access
    const { data: user, error: userError } = await supabase
      .from('crm_users')
      .select('is_active')
      .eq('email', session.user.email)
      .single()

    if (userError) throw userError

    if (!user || !user.is_active) {
      await supabase.auth.signOut()
      return redirectToLogin(req, 'no_access')
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
  matcher: ['/((?!api/public|_next/static|_next/image|favicon.ico).*)'],
}