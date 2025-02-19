import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendTaskEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'
export const revalidate = 0

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get the logged-in user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'No authenticated user found',
        error: sessionError?.message
      }, { status: 401 });
    }

    const userEmail = session.user.email;

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
      .gte('due_date::date', today)
      .limit(5);

    if (tasksError) {
      throw new Error(`Tasks query error: ${tasksError.message}`);
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No tasks found for testing',
        debug: { date: today }
      });
    }

    try {
      console.log('Attempting to send email to:', userEmail);
      console.log('Tasks found:', tasks.length);
      
      await sendTaskEmail(userEmail, tasks);
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent',
        recipient: userEmail,
        tasksIncluded: tasks.length,
        timestamp: new Date().toISOString(),
        emailConfig: {
          sender: process.env.GMAIL_USER,
          configured: !!process.env.GMAIL_APP_PASSWORD
        }
      });

    } catch (emailError: any) {
      console.error('Email sending error:', emailError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to send test email',
        details: emailError.message,
        emailConfig: {
          sender: process.env.GMAIL_USER,
          configured: !!process.env.GMAIL_APP_PASSWORD
        }
      }, { 
        status: 500 
      });
    }

  } catch (error: any) {
    console.error('General error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to process request', 
      details: error.message 
    }, { 
      status: 500 
    });
  }
}
