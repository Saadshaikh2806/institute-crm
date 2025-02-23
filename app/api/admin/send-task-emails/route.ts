import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

// Add Task interface
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

const resend = new Resend(process.env.RESEND_API_KEY)
const HOURS_BETWEEN_SENDS = 6
const MAX_SENDS_PER_DAY = 2

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Verify admin and check send limits
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's email sends
    const { data: todaySends } = await supabase
      .from('email_sends')
      .select('sent_at')
      .gte('sent_at', today.toISOString())
      .order('sent_at', { ascending: false })

    // Check daily limit
    if (todaySends && todaySends.length >= MAX_SENDS_PER_DAY) {
      return NextResponse.json({ 
        error: 'Daily send limit reached',
        nextAvailable: 'tomorrow'
      }, { status: 429 })
    }

    // Check time gap if there was a previous send
    if (todaySends && todaySends.length > 0) {
      const lastSend = new Date(todaySends[0].sent_at)
      const hoursSinceLastSend = (Date.now() - lastSend.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastSend < HOURS_BETWEEN_SENDS) {
        const hoursRemaining = Math.ceil(HOURS_BETWEEN_SENDS - hoursSinceLastSend)
        return NextResponse.json({
          error: 'Too soon since last send',
          nextAvailable: `in ${hoursRemaining} hours`
        }, { status: 429 })
      }
    }

    // Get incomplete tasks with type
    const { data: tasks } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)
      .returns<Task[]>()

    if (!tasks?.length) {
      return NextResponse.json({ 
        success: true, 
        emailsSent: 0,
        message: 'No incomplete tasks found' 
      })
    }

    // Group tasks by user with proper typing
    const tasksByUser = tasks.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.user_email]) acc[task.user_email] = []
      acc[task.user_email].push(task)
      return acc
    }, {})

    const results = []

    // Send emails with proper typing
    for (const [email, userTasks] of Object.entries(tasksByUser)) {
      try {
        const tasksList = userTasks
          .map((t: Task) => `${t.task_title} - ${t.customer_name} (${t.customer_phone})`)
          .join('\n- ')

        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: 'Task Reminder',
          react: EmailTemplate({
            customerName: 'Multiple Customers',
            userName: email.split('@')[0],
            daysWithoutContact: 0,
            tasksList: `- ${tasksList}`
          })
        })
        
        results.push(result)
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error)
      }
    }

    // Record the email send
    await supabase
      .from('email_sends')
      .insert({
        sent_by: session.user.id,
        email_count: results.length
      })

    return NextResponse.json({
      success: true,
      emailsSent: results.length,
      remainingSends: MAX_SENDS_PER_DAY - (todaySends?.length || 0) - 1
    })
  } catch (error) {
    console.error('Error sending task emails:', error)
    return NextResponse.json({ 
      error: 'Failed to send emails' 
    }, { status: 500 })
  }
}

// Add endpoint to check send availability
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const { data: todaySends } = await supabase
      .from('email_sends')
      .select('sent_at')
      .gte('sent_at', today.toISOString())
      .order('sent_at', { ascending: false })

    const canSend = !todaySends || todaySends.length < MAX_SENDS_PER_DAY
    let nextAvailable = null

    if (todaySends && todaySends.length > 0) {
      const lastSend = new Date(todaySends[0].sent_at)
      const hoursSinceLastSend = (Date.now() - lastSend.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastSend < HOURS_BETWEEN_SENDS) {
        nextAvailable = new Date(lastSend.getTime() + (HOURS_BETWEEN_SENDS * 60 * 60 * 1000))
      }
    }

    return NextResponse.json({
      canSend,
      sendCount: todaySends?.length || 0,
      maxSends: MAX_SENDS_PER_DAY,
      nextAvailable
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check send status' }, { status: 500 })
  }
}
