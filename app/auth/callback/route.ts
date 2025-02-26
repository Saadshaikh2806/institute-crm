import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

      // Update last login
      await supabase
        .from('crm_users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', session.user.email)

      // Always redirect admin to admin panel, regular users to dashboard
      const redirectPath = user.role === 'admin' ? '/admin' : '/'
      return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
    } catch (error) {
      console.error('Callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
}
