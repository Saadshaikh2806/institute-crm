import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

// Initialize Supabase client
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

// Set maxDuration to 60 seconds (maximum allowed for hobby plan)
export const maxDuration = 60

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

    // First get active users
    const { data: users, error: userError } = await supabase
      .from('crm_users')
      .select('id, email, full_name')
      .eq('is_active', true)

    if (userError) {
      console.error('Error fetching users:', userError)
      throw userError
    }

    console.log(`Found ${users?.length || 0} active users`)

    const results = []

    // Process each user
    for (const user of users) {
      try {
        // Get leads for this user
        const { data: leads, error: leadsError } = await supabase
          .from('customers')
          .select('name, created_at, last_contact')
          .eq('assigned_to', user.id)
          .eq('status', 'lead')
          .gt('last_contact', 'now() - interval \'7 days\'')

        if (leadsError) {
          console.error(`Error fetching leads for ${user.email}:`, leadsError)
          continue
        }

        if (!leads?.length) {
          console.log(`No leads found for ${user.email}`)
          continue
        }

        console.log(`Found ${leads.length} leads for ${user.email}`)

        // Send email
        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: user.email,
          subject: 'Daily Lead Follow-up Reminder',
          react: EmailTemplate({
            customerName: leads.map(l => l.name).join(', '),
            userName: user.full_name,
            daysWithoutContact: 7
          })
        })

        results.push(emailResult)
        console.log(`Email sent successfully to ${user.email}`)
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error)
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
