import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  console.log('Task email cron triggered at:', new Date().toISOString())

  try {
    // Get incomplete tasks
    const { data: tasks } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)

    if (!tasks?.length) {
      return res.json({ message: 'No incomplete tasks found' })
    }

    // Group by user
    const userTasks = {}
    tasks.forEach(task => {
      if (!userTasks[task.user_email]) {
        userTasks[task.user_email] = []
      }
      userTasks[task.user_email].push(task)
    })

    // Send emails
    for (const [email, tasks] of Object.entries(userTasks)) {
      const taskList = tasks
        .map(t => `• ${t.task_title} - ${t.customer_name}`)
        .join('\n')

      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your Pending Tasks',
        text: `Hello,\n\nYou have the following incomplete tasks:\n\n${taskList}\n\nBest regards,\nADCI CRM`
      })
      
      console.log(`Sent email to ${email} for ${tasks.length} tasks`)
    }

    return res.json({
      success: true,
      emailsSent: Object.keys(userTasks).length
    })
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: 'Failed to process tasks' })
  }
}
