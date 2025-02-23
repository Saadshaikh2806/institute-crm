import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get all active users
    const { data: users } = await supabase
      .from('crm_users')
      .select('id, email, full_name')
      .eq('is_active', true)

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No active users found' })
    }

    console.log(`Processing ${users.length} users for daily emails`)

    const emailPromises = users.map(async (user) => {
      // Get leads for this user that need follow-up
      const { data: leads } = await supabase
        .from('customers')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('status', 'lead')
        .gt('last_contact', 'now() - interval \'7 days\'')

      if (!leads || leads.length === 0) return null

      // Send email for each lead
      return resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email!,
        subject: `Daily Lead Follow-up Reminder`,
        react: EmailTemplate({
          customerName: leads.map(l => l.name).join(', '),
          userName: user.full_name,
          daysWithoutContact: 7
        })
      })
    })

    const results = await Promise.all(emailPromises.filter(Boolean))
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} emails`
    })
  } catch (error) {
    console.error('Daily email cron error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
