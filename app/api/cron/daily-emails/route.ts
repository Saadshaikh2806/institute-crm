import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

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
export const maxDuration = 60

export async function GET(request: Request) {
  console.log('Cron endpoint hit:', new Date().toISOString())
  
  try {
    const proxySignature = request.headers.get('x-vercel-proxy-signature')
    const isVercelCron = !!proxySignature && proxySignature.startsWith('Bearer ')
    
    if (!isVercelCron) {
      console.log('Not a Vercel cron request')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Starting cron execution with auth:', true)

    // Get tasks due today from the view
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)
      .gte('due_date', new Date().toISOString().split('T')[0]) // Today's date
      .lte('due_date', new Date().toISOString().split('T')[0]) // Today's date
      .returns<Task[]>()

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      throw tasksError
    }

    console.log(`Found ${tasks?.length || 0} tasks due today`)

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
        console.log(`Processing ${userTasks.length} tasks for ${email}`)

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
        console.log(`Email sent successfully to ${email}`)
      } catch (error) {
        console.error(`Error processing tasks for ${email}:`, error)
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
