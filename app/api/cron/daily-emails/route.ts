import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

export const maxDuration = 300 // Set max duration to 5 minutes

export async function GET(request: Request) {
  console.log('Cron endpoint hit:', new Date().toISOString())
  
  try {
    // Verify Vercel cron
    const proxySignature = request.headers.get('x-vercel-proxy-signature')
    const isVercelCron = !!proxySignature && proxySignature.startsWith('Bearer ')
    
    if (!isVercelCron) {
      console.log('Not a Vercel cron request')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Starting cron execution with auth:', true)

    // Get active users with leads
    const { data: users, error: userError } = await supabase
      .from('crm_users')
      .select(`
        id,
        email,
        full_name,
        customers!inner (
          id,
          name,
          status,
          last_contact
        )
      `)
      .eq('is_active', true)
      .eq('customers.status', 'lead')
      .gt('customers.last_contact', 'now() - interval \'7 days\'')

    if (userError) {
      console.error('Database error fetching users:', userError)
      throw userError
    }

    console.log(`Found ${users?.length || 0} users with leads`)

    if (!users?.length) {
      return NextResponse.json({ message: 'No users with leads found' })
    }

    const results = []

    for (const user of users) {
      try {
        console.log(`Processing user ${user.email} with ${user.customers?.length || 0} leads`)

        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: user.email!,
          subject: 'Daily Lead Follow-up Reminder',
          react: EmailTemplate({
            customerName: user.customers.map(c => c.name).join(', '),
            userName: user.full_name,
            daysWithoutContact: 7
          })
        })

        results.push(emailResult)
        console.log(`Email sent successfully to ${user.email}`)
      } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error)
      }
    }

    const successCount = results.length
    console.log(`Completed cron job. Sent ${successCount} emails`)

    return NextResponse.json({
      success: true,
      emailsSent: successCount
    })

  } catch (error) {
    console.error('Fatal cron error:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
