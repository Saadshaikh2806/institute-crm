import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendDailyTasksEmail } from '@/lib/email-service';

export const runtime = 'edge';

export async function GET(request: Request) {
  console.log('Daily tasks API called');
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    console.log('Authorization failed');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Create a Supabase client with the service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Fetch active users
    console.log('Fetching active users...');
    const { data: users, error: usersError } = await supabase
      .from('crm_users')
      .select('*')
      .eq('is_active', true);

    if (usersError) throw usersError;
    console.log('Active users found:', users);

    // Process each user
    for (const user of users) {
      console.log('Processing user:', user);
      
      // Fetch tasks from the view
      const { data: taskData, error: taskError } = await supabase
        .from('daily_tasks_view')
        .select('*');

      if (taskError) {
        console.error('Task fetch error:', taskError);
        continue;
      }

      console.log('Raw task data:', taskData);

      // Filter tasks for this user
      const userTasks = taskData?.filter(task => task.user_email === user.email);
      console.log('Filtered tasks for user:', userTasks);

      if (!userTasks || userTasks.length === 0) {
        console.log('No tasks found for user:', user.email);
        continue;
      }

      // Format data for email
      const customerTasks = userTasks.reduce((acc: any[], task: any) => {
        const existingCustomer = acc.find(c => c.customerName === task.customer_name);
        
        if (existingCustomer) {
          existingCustomer.tasks.push({
            title: task.task_title,
            dueDate: task.due_date,
            completed: task.completed
          });
        } else {
          acc.push({
            customerName: task.customer_name,
            customerPhone: task.customer_phone,
            tasks: [{
              title: task.task_title,
              dueDate: task.due_date,
              completed: task.completed
            }]
          });
        }
        
        return acc;
      }, []);

      console.log('Sending email to:', user.email, 'with tasks:', customerTasks);
      
      try {
        await sendDailyTasksEmail(user.email, { customerTasks });
        console.log('Email sent successfully to:', user.email);
      } catch (emailError) {
        console.error('Failed to send email to:', user.email, emailError);
      }
    }

    return new NextResponse('Emails sent successfully', { status: 200 });
  } catch (error: any) {
    console.error('Error processing daily tasks:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
