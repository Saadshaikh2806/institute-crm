import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify admin access
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('crm_users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get incomplete tasks
    const { data: tasks } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)

    if (!tasks?.length) {
      return NextResponse.json({ 
        success: true, 
        emailsSent: 0,
        message: 'No incomplete tasks found' 
      })
    }

    // Group tasks by user
    const tasksByUser = tasks.reduce((acc, task) => {
      if (!acc[task.user_email]) acc[task.user_email] = []
      acc[task.user_email].push(task)
      return acc
    }, {})

    const results = []

    // Send emails
    for (const [email, userTasks] of Object.entries(tasksByUser)) {
      try {
        const tasksList = userTasks
          .map(t => `${t.task_title} - ${t.customer_name} (${t.customer_phone})`)
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

    return NextResponse.json({
      success: true,
      emailsSent: results.length
    })
  } catch (error) {
    console.error('Error sending task emails:', error)
    return NextResponse.json({ 
      error: 'Failed to send emails' 
    }, { status: 500 })
  }
}
