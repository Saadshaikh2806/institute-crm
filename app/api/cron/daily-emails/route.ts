import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

// Force dynamic for cron
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Define types for our task data
interface Task {
  task_id: number
  task_title: string
  due_date: string
  completed: boolean
  customer_name: string
  customer_phone: string
  user_email: string
  user_id: string
  customer_id: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Cron endpoint hit`)
  
  try {
    // Log headers for debugging
    console.log(`[${timestamp}] Request headers:`, Object.fromEntries(request.headers.entries()))
    
    // Check for Vercel's deployment URL to verify it's a legitimate cron request
    const deploymentUrl = request.headers.get('x-vercel-deployment-url')
    const isVercelRequest = !!deploymentUrl && 
      request.headers.get('user-agent')?.includes('vercel-cron')
    
    // Allow requests from Vercel cron or with our secret
    const authHeader = request.headers.get('authorization')
    const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET_KEY}`
    
    console.log(`[${timestamp}] Auth check:`, { isVercelRequest, hasValidAuth })

    if (!isVercelRequest && !hasValidAuth) {
      console.log(`[${timestamp}] Unauthorized request`)
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log(`[${timestamp}] Starting task fetching`)

    // Get all incomplete tasks from the view
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)  // Only filter by completion status
      .returns<Task[]>()

    if (tasksError) {
      console.error(`[${timestamp}] Error fetching tasks:`, tasksError)
      throw tasksError
    }

    console.log(`[${timestamp}] Found ${tasks?.length || 0} incomplete tasks`)

    // Group tasks by user_email
    const tasksByUser = tasks?.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.user_email]) {
        acc[task.user_email] = []
      }
      acc[task.user_email].push(task)
      return acc
    }, {}) || {}

    const results = []

    // Send emails for each user's tasks
    for (const [email, userTasks] of Object.entries(tasksByUser)) {
      try {
        console.log(`[${timestamp}] Processing ${userTasks.length} tasks for ${email}`)

        const tasksList = userTasks
          .map((t: Task) => `${t.task_title} - ${t.customer_name} (${t.customer_phone})`)
          .join('\n- ')

        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: 'Daily Tasks Reminder',
          react: EmailTemplate({
            customerName: 'Multiple Customers',
            userName: email.split('@')[0], // Simple name extraction
            daysWithoutContact: 0,
            tasksList: `- ${tasksList}` // Add this to your EmailTemplate props
          })
        })

        results.push(emailResult)
        console.log(`[${timestamp}] Email sent successfully to ${email}`)
      } catch (error) {
        console.error(`[${timestamp}] Error processing tasks for ${email}:`, error)
      }
    }

    const successCount = results.length
    console.log(`[${timestamp}] Completed cron job. Sent ${successCount} emails`)

    // Add response headers for debugging
    return NextResponse.json({
      success: true,
      timestamp,
      emailsSent: successCount
    }, {
      headers: {
        'x-cron-execution-time': timestamp
      }
    })

  } catch (error) {
    console.error(`[${timestamp}] Fatal error:`, error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      timestamp,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
