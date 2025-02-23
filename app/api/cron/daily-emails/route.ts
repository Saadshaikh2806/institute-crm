import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

// Initialize Supabase with service role for broader access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  console.log('Daily email cron job started')
  
  try {
    // Log environment check
    console.log('Checking environment variables:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasEmailFrom: !!process.env.EMAIL_FROM,
    })

    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      console.log('Authorization failed')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get all active users
    const { data: users, error: userError } = await supabase
      .from('crm_users')
      .select('id, email, full_name')
      .eq('is_active', true)

    if (userError) {
      console.error('Error fetching users:', userError)
      throw userError
    }

    console.log(`Found ${users?.length || 0} active users`)

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No active users found' })
    }

    const emailResults = []
    
    // Process each user sequentially instead of in parallel
    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email}`)
        
        // Get leads for this user
        const { data: leads, error: leadsError } = await supabase
          .from('customers')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('status', 'lead')
          .gt('last_contact', 'now() - interval \'7 days\'')

        if (leadsError) {
          console.error(`Error fetching leads for ${user.email}:`, leadsError)
          continue
        }

        if (!leads || leads.length === 0) {
          console.log(`No leads found for ${user.email}`)
          continue
        }

        console.log(`Found ${leads.length} leads for ${user.email}`)

        // Send email
        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: user.email!,
          subject: `Daily Lead Follow-up Reminder`,
          react: EmailTemplate({
            customerName: leads.map(l => l.name).join(', '),
            userName: user.full_name,
            daysWithoutContact: 7
          })
        })

        console.log(`Email sent to ${user.email}:`, emailResult)
        emailResults.push(emailResult)
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${emailResults.length} emails successfully`,
      results: emailResults
    })
  } catch (error) {
    console.error('Fatal error in daily email cron:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
