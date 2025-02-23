import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailTemplate } from '@/components/email/email-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Verify the cron secret to ensure the request is legitimate
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get customers who need follow-up
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'lead')
      .gt('last_contact', 'now() - interval \'7 days\'')

    if (!customers || customers.length === 0) {
      return NextResponse.json({ message: 'No customers need follow-up' })
    }

    // Send emails for each customer
    const emailPromises = customers.map(async (customer) => {
      const { data: user } = await supabase
        .from('crm_users')
        .select('email, full_name')
        .eq('id', customer.assigned_to)
        .single()

      if (!user?.email) return null

      return resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: `Follow-up Reminder: ${customer.name}`,
        react: EmailTemplate({ 
          customerName: customer.name,
          userName: user.full_name,
          daysWithoutContact: 7,
          pendingTasks: [] // Add empty array to satisfy TypeScript
        })
      })
    })

    await Promise.all(emailPromises.filter(Boolean))

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${customers.length} follow-up emails` 
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
