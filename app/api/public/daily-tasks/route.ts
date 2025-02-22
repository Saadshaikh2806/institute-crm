import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendDailyTasksEmail, EMAIL_CONFIG } from '@/lib/email-service';

export const runtime = 'edge';

export async function GET(request: Request) {
  console.log('Public daily tasks API called');
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    console.log('Authorization failed:', authHeader);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Get all users with tasks for today
    const { data: userEmails, error: usersError } = await supabase
      .from('daily_tasks_view')
      .select('user_email')
      .gte('due_date', startOfDay)
      .lt('due_date', endOfDay)
      .not('user_email', 'is', null);

    if (usersError) throw usersError;

    // Convert to unique emails array, filtering out any undefined/null values
    const uniqueEmails = Array.from(new Set(
      userEmails?.map(row => row.user_email).filter(Boolean) || []
    ));
    console.log('Found unique users:', uniqueEmails.length);

    let emailsSent = 0;

    for (const user_email of uniqueEmails) {
      // Check email throttling
      const { data: lastEmail } = await supabase
        .from('email_logs')
        .select('sent_at')
        .eq('user_email', user_email)
        .order('sent_at', { ascending: false })
        .limit(1);

      const lastSendTime = lastEmail?.[0]?.sent_at;
      
      if (lastSendTime) {
        const timeSinceLastEmail = Math.floor(
          (now.getTime() - new Date(lastSendTime).getTime()) / 1000
        );
        
        if (timeSinceLastEmail < EMAIL_CONFIG.cooldownPeriod) {
          console.log(`Skipping ${user_email} - Cooldown period not elapsed`);
          continue;
        }
      }

      // Get tasks for this user (only today's tasks)
      const { data: userTasks, error: tasksError } = await supabase
        .from('daily_tasks_view')
        .select('*')
        .eq('user_email', user_email)
        .gte('due_date', startOfDay)
        .lt('due_date', endOfDay);

      if (tasksError) {
        console.error(`Error fetching tasks for ${user_email}:`, tasksError);
        continue;
      }

      // Format tasks for email
      const customerTasks = userTasks.reduce((acc: any[], task) => {
        const existingCustomer = acc.find(c => c.customerName === task.customer_name);
        
        if (existingCustomer) {
          existingCustomer.tasks.push({
            title: task.task_title,
            dueDate: new Date(task.due_date).toLocaleString(),
            completed: task.completed
          });
        } else {
          acc.push({
            customerName: task.customer_name,
            customerPhone: task.customer_phone,
            tasks: [{
              title: task.task_title,
              dueDate: new Date(task.due_date).toLocaleString(),
              completed: task.completed
            }]
          });
        }
        return acc;
      }, []);

      try {
        // Send email
        const emailResponse = await sendDailyTasksEmail(user_email, { customerTasks });
        
        if (emailResponse.error) {
          console.error('Email send error:', emailResponse.error);
          continue;
        }
        
        // Only log if email was actually sent
        await supabase
          .from('email_logs')
          .insert([{ 
            user_email: user_email,
            sent_at: now.toISOString(),
            status: 'success'
          }]);
        
        emailsSent++;
        console.log('Email sent and logged for:', user_email);
      } catch (emailError: unknown) {
        console.error('Failed to send email to:', user_email, emailError);
        // Log failed attempt
        await supabase
          .from('email_logs')
          .insert([{ 
            user_email: user_email,
            sent_at: now.toISOString(),
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }]);
      }
    }

    return new NextResponse(`Processed ${userEmails?.length} users, sent ${emailsSent} emails`, { 
      status: 200 
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
