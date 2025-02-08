import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  // Clear server-side session
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear the session cookie
  const response = NextResponse.json(
    { message: 'Signed out successfully' },
    { status: 200 }
  )

  // Clear all authentication cookies
  response.cookies.delete('supabase-auth-token')
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')

  return response
}
