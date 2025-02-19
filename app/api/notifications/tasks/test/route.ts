import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { sendTaskEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'

export async function GET(request: NextRequest) {
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

    // Get both today's tasks and upcoming tasks for testing
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
      .or(`due_date.eq.${today},due_date.gt.${today}`)
      .order('due_date', { ascending: true })
      .limit(10);

    if (tasksError) {
      throw new Error(`Tasks query error: ${tasksError.message}`);
    }

    // Always send email, even if no tasks (to test sarcastic messages)
    try {
      await sendTaskEmail(userEmail, tasks || []);

      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        timestamp: new Date().toISOString(),
        details: {
          recipient: userEmail,
          tasksIncluded: tasks?.length || 0,
          emailType: tasks?.length ? 'task-list' : 'sarcastic-empty',
          requestDate: today
        }
      });

    } catch (emailError: any) {
      console.error('Failed to send test email:', emailError);
      return NextResponse.json({ 
        success: false,
        error: 'Email sending failed',
        details: emailError.message
      }, { 
        status: 500 
      });
    }

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Test endpoint failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}
