import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Define types if @vercel/node is not available
interface VercelRequest extends Request {
  query: { [key: string]: string | string[] }
  cookies: { [key: string]: string }
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (data: any) => void
}

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

// Initialize clients outside the handler
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  console.log('Serverless cron function triggered:', new Date().toISOString())

  try {
    // Get incomplete tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks_view')
      .select('*')
      .eq('completed', false)
      .returns<Task[]>()

    if (tasksError) {
      throw tasksError
    }

    console.log(`Found ${tasks?.length || 0} incomplete tasks`)

    // Group by email with proper typing
    const tasksByUser = tasks.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.user_email]) {
        acc[task.user_email] = []
      }
      acc[task.user_email].push(task)
      return acc
    }, {})

    const results = []

    // Send emails
    for (const [email, userTasks] of Object.entries(tasksByUser)) {
      try {
        const tasksList = userTasks
          .map((t: Task) => `${t.task_title} - ${t.customer_name} (${t.customer_phone})`)
          .join('\n- ')

        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: 'Daily Tasks Reminder',
          text: `Hello ${email.split('@')[0]},\n\nYou have the following incomplete tasks:\n\n- ${tasksList}\n\nADCI CRM System`
        })

        results.push(result)
        console.log(`Email sent to ${email}`)
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error)
      }
    }

    return response.json({
      success: true,
      emailsSent: results.length
    })
  } catch (error) {
    console.error('Cron execution error:', error)
    return response.status(500).json({ error: 'Internal Server Error' })
  }
}
