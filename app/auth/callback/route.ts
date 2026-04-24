import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_TOKEN_COOKIE } from '@/lib/single-session'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Auth error:', sessionError)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`)
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.email) {
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_user`)
      }

      // Get the user's role and active status
      const { data: user, error: userError } = await supabase
        .from('crm_users')
        .select('role, is_active')
        .eq('email', session.user.email)
        .single()

      if (userError || !user) {
        console.error('User error:', userError)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_access`)
      }

      // Check if user is active
      if (!user.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${requestUrl.origin}/login?error=inactive`)
      }

      const sessionToken = createSessionToken()

      // Update last login and mark this browser as the only active session
      await supabase
        .from('crm_users')
        .update({
          last_login: new Date().toISOString(),
          active_session_token: sessionToken
        })
        .eq('email', session.user.email)

      // Always redirect admin to admin panel, regular users to dashboard
      const redirectPath = user.role === 'admin' ? '/admin' : '/'
      const response = NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
      response.cookies.set(SESSION_TOKEN_COOKIE, sessionToken, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax'
      })
      return response
    } catch (error) {
      console.error('Callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
}
