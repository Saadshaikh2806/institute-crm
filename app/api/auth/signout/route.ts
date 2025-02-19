import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  // Sign out the user
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({
      error: 'Error signing out',
      details: error.message
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Signed out successfully'
  })
}

// Handle GET requests to redirect to home
export async function GET() {
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'))
}
