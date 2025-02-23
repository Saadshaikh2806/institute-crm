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

interface Customer {
  name: string;
  engagement: number;
  interest_level: number;
  budget_fit: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  title: string;
  duedate: string;
  customers: {
    name: string;
  } | null;
}

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
        // Get leads for this user using the correct columns
        const { data: leads, error: leadsError } = await supabase
          .from('customers')
          .select('name, created_at, updated_at, engagement, interest_level, budget_fit')
          .eq('user_id', user.id) // Using user_id instead of assigned_to
          .eq('status', 'lead')
          .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        if (leadsError) {
          console.error(`Error fetching leads for ${user.email}:`, leadsError)
          continue
        }

        // Get pending tasks for this user - fixed type assertion
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('title, duedate, customers(name)')
          .eq('user_id', user.id)
          .eq('completed', false)
          .eq('status', 'pending')
          .lt('duedate', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) as { 
            data: Task[] | null; 
            error: any; 
          }

        if (tasksError) {
          console.error(`Error fetching tasks for ${user.email}:`, tasksError)
          continue
        }

        if (!leads?.length && (!tasks || tasks.length === 0)) {
          console.log(`No leads or pending tasks found for ${user.email}`)
          continue
        }

        // Calculate lead scores and filter for high-priority leads
        const highPriorityLeads = leads.filter(lead => {
          const score = Math.round(
            (Number(lead.engagement) + Number(lead.interest_level) + Number(lead.budget_fit)) / 3
          )
          return score >= 70 // Threshold for high-priority leads
        })

        if (!highPriorityLeads.length && (!tasks || tasks.length === 0)) {
          console.log(`No high-priority leads or pending tasks for ${user.email}`)
          continue
        }

        console.log(`Found ${highPriorityLeads.length} high-priority leads and ${tasks?.length || 0} tasks for ${user.email}`)

        // Send email
        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: user.email,
          subject: 'Daily CRM Update: Leads and Tasks',
          react: EmailTemplate({
            customerName: highPriorityLeads.map((l: Customer) => l.name).join(', '),
            userName: user.full_name,
            daysWithoutContact: 7,
            pendingTasks: tasks?.map(t => ({
              title: t.title,
              dueDate: t.duedate,
              customerName: t.customers?.name
            })) || []
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
