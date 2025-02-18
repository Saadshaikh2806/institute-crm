import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { format } from 'date-fns'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Move this check to the top and make it more strict
if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === '') {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

// Initialize Resend with proper error handling
let resend: Resend;
try {
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
  console.error('Failed to initialize Resend:', error);
  throw error;
}

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

export async function GET(req: Request) {
  console.log('Task notification endpoint called at:', new Date().toISOString())
  
  const supabase = createRouteHandlerClient({ cookies })
  const today = new Date().toISOString().split('T')[0];

  try {
    // Verify Resend API key
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    console.log('Checking for tasks due on:', today);

    // Simpler query to get tasks
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
      .eq('due_date::date', today);

    if (tasksError) {
      throw new Error(`Tasks query error: ${tasksError.message}`);
    }

    console.log('Tasks found:', tasks?.length || 0);
    if (tasks) {
      console.log('Sample task:', JSON.stringify(tasks[0], null, 2));
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No tasks due today',
        debug: {
          date: today,
          currentTime: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(tasks.map(task => task.user_id))];
    console.log('Unique user IDs:', userIds);

    // Fetch users with fallback logic
    let users;
    const { data: rpcUsers, error: usersError } = await supabaseAdmin.rpc('get_user_emails', {
      user_ids: userIds
    });

    if (usersError || !rpcUsers || rpcUsers.length === 0) {
      console.log('RPC call failed or returned no users, trying direct auth query');
      const { data: authUsers, error: authError } = await supabaseAdmin
        .from('users')
        .select('id:user_id, email')
        .in('user_id', userIds);

      if (authError || !authUsers?.length) {
        throw new Error('No users found for tasks');
      }

      users = authUsers;
    } else {
      users = rpcUsers;
    }

    console.log('Users found:', users.length);

    // Group tasks by user
    const tasksByUser = tasks.reduce((acc: any, task) => {
      if (!acc[task.user_id]) acc[task.user_id] = [];
      acc[task.user_id].push(task);
      return acc;
    }, {});

    // Send emails
    const emailResults = [];
    for (const user of users) {
      const userTasks = tasksByUser[user.id];
      if (!userTasks?.length) continue;

      // During testing, override recipient with verified email
      const recipientEmail = process.env.NODE_ENV === 'development' 
        ? 'adci.exam@gmail.com'  // Use verified email in development
        : user.email;

      console.log('Attempting to send email to:', recipientEmail, 
        process.env.NODE_ENV === 'development' ? '(using test email)' : '');
      
      try {
        const emailResult = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: [recipientEmail],
          subject: `${user.name || 'User'}, you have ${userTasks.length} task(s) due today`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Task Reminder</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>You have ${userTasks.length} task(s) due today:</p>
                <ul style="line-height: 1.6;">
                  ${userTasks.map((task: any) => `
                    <li>
                      <strong>${task.title}</strong>
                      ${task.customers ? 
                        `<br>
                        <span style="color: #666; margin-left: 10px;">
                          Customer: ${task.customers.name}
                        </span>`
                        : ''}
                    </li>
                  `).join('')}
                </ul>
                ${process.env.NODE_ENV === 'development' 
                  ? `<p><em>Note: This is a test email. Original recipient would have been: ${user.email}</em></p>`
                  : ''}
                <p style="color: #666; margin-top: 20px;">
                  Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </p>
              </body>
            </html>
          `
        });

        console.log('Raw Resend response:', emailResult);

        if (!emailResult?.data?.id) {
          throw new Error(`Invalid Resend API response: ${JSON.stringify(emailResult)}`);
        }

        emailResults.push({ 
          user: user.email, 
          success: true, 
          messageId: emailResult.data.id,
          timestamp: new Date().toISOString()
        });

      } catch (error: any) {
        console.error('Detailed email error:', {
          error: error.message,
          name: error.name,
          stack: error.stack,
          response: error.response
        });
        
        emailResults.push({ 
          user: user.email, 
          success: false, 
          error: `${error.name}: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: emailResults,
      tasksFound: tasks.length,
      usersNotified: users.length
    });

  } catch (error: any) {
    console.error('Notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notifications', 
      details: error.message,
      timestamp: new Date().toISOString(),
      debugInfo: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date().toISOString()
      }
    }, { 
      status: 500 
    });
  }
}
