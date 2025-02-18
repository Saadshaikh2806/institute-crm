import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTaskEmail } from '@/utils/email'

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
  const supabase = createRouteHandlerClient({ cookies })
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get the logged-in user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        success: false, 
        message: 'No authenticated user found',
        error: sessionError?.message
      }, { status: 401 });
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'User email not found'
      }, { status: 400 });
    }

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

    // Always send email, even with empty tasks array
    try {
      await sendTaskEmail(userEmail, tasks || []);
    } catch (emailError: any) {
      console.error(`Failed to send email to ${userEmail}:`, emailError);
      throw emailError;
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      tasksFound: tasks?.length || 0,
      emailSentTo: userEmail,
      emailType: tasks?.length ? 'task-list' : 'sarcastic-empty'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to fetch tasks or send emails', 
      details: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}
