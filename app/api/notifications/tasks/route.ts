import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sql } from '@vercel/postgres'
import { sendNotificationEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// This function will be called by the cron job
export async function GET() {
  try {
    // Get all tasks where the deadline is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const { rows: tasks } = await sql`
      SELECT t.*, c.name as customer_name, c.email as customer_email
      FROM tasks t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.deadline::date = ${tomorrowDate}::date
      AND t.status != 'completed'
    `;

    // If there are no tasks due tomorrow, return early
    if (tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks due tomorrow' }, { status: 200 });
    }

    // Send email notifications for each task
    for (const task of tasks) {
      await sendNotificationEmail({
        to: task.customer_email,
        subject: 'Task Deadline Reminder',
        text: `Reminder: Your task "${task.title}" is due tomorrow.`,
        html: `
          <h2>Task Deadline Reminder</h2>
          <p>This is a reminder that your task "${task.title}" is due tomorrow.</p>
          <p>Task Details:</p>
          <ul>
            <li>Title: ${task.title}</li>
            <li>Description: ${task.description}</li>
            <li>Deadline: ${new Date(task.deadline).toLocaleDateString()}</li>
          </ul>
        `
      });
    }

    return NextResponse.json({ success: true, tasksNotified: tasks.length }, { status: 200 });

  } catch (error) {
    console.error('Error in task notification cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
