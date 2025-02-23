import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  // Simple console log to verify the route is hit
  console.log('Cron endpoint hit:', new Date().toISOString())

  // Basic auth check
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Log start of execution
    console.log('Starting cron execution with auth:', !!authHeader)

    // Get active users
    const { data: users, error: userError } = await supabase
      .from('crm_users')
      .select('id, email, full_name')
      .eq('is_active', true)

    if (userError) throw userError

    if (!users?.length) {
      return NextResponse.json({ message: 'No users found' })
    }

    const results = []

    for (const user of users) {
      try {
        // Get leads needing follow-up
        const { data: leads } = await supabase
          .from('customers')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('status', 'lead')
          .gt('last_contact', 'now() - interval \'7 days\'')

        if (!leads?.length) continue

        // Send email
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: user.email!,
          subject: 'Daily Lead Follow-up Reminder',
          react: EmailTemplate({
            customerName: leads.map(l => l.name).join(', '),
            userName: user.full_name,
            daysWithoutContact: 7
          })
        })

        results.push(result)
        console.log(`Email sent to ${user.email}`)
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: results.length
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Cron execution error:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
