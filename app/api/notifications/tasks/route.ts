import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { format } from 'date-fns'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get all tasks due today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        customers (
          name,
          email,
          phone
        )
      `)
      .eq('completed', false)
      .eq('due_date::date', today.toISOString().split('T')[0])

    if (tasksError) throw tasksError

    // Group tasks by user_id
    const tasksByUser = tasks.reduce((acc: any, task) => {
      if (!acc[task.user_id]) {
        acc[task.user_id] = []
      }
      acc[task.user_id].push(task)
      return acc
    }, {})

    // Get user emails
    const userIds = Object.keys(tasksByUser)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds)

    if (usersError) throw usersError

    // Send emails to each user
    for (const user of users) {
      const userTasks = tasksByUser[user.id]
      if (!userTasks?.length) continue

      const emailContent = `
        <h2>You have ${userTasks.length} task${userTasks.length > 1 ? 's' : ''} due today</h2>
        <ul>
          ${userTasks.map((task: any) => `
            <li style="margin-bottom: 10px;">
              <strong>${task.title}</strong><br>
              Customer: ${task.customers.name}<br>
              Phone: ${task.customers.phone}<br>
              Due: ${format(new Date(task.due_date), 'PPP')}
            </li>
          `).join('')}
        </ul>
      `

      await resend.emails.send({
        from: 'notifications@your-domain.com',
        to: user.email,
        subject: `You have ${userTasks.length} task${userTasks.length > 1 ? 's' : ''} due today`,
        html: emailContent
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending notifications:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
