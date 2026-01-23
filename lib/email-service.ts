import { Resend } from 'resend';
import { DailyTasksEmail } from '@/emails/daily-tasks-email';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const EMAIL_CONFIG = {
  cooldownPeriod: process.env.EMAIL_COOLDOWN_PERIOD
    ? parseInt(process.env.EMAIL_COOLDOWN_PERIOD)
    : 20,
  testMode: false,
  testEmail: process.env.TEST_EMAIL || 'adci.exam@gmail.com',
  fromEmail: process.env.EMAIL_FROM || 'notifications@notification.zintaxideaz.com'
};

export async function sendDailyTasksEmail(to: string, data: any) {
  if (!resend) {
    console.log('Email service skipped: No RESEND_API_KEY configured');
    return { success: true, skipped: true };
  }

  console.log('Attempting to send email to:', to);

  try {
    const emailTo = EMAIL_CONFIG.testMode ? EMAIL_CONFIG.testEmail : to;
    const fromEmail = EMAIL_CONFIG.fromEmail;

    console.log('Sending email from:', fromEmail, 'to:', emailTo);

    const response = await resend.emails.send({
      from: fromEmail,
      to: [emailTo],
      subject: `Daily Tasks Summary - ${new Date().toLocaleDateString()}`,
      react: DailyTasksEmail({
        data,
        originalRecipient: EMAIL_CONFIG.testMode ? to : undefined
      })
    });

    if (response.error) {
      throw new Error(`Email send failed: ${response.error.message}`);
    }

    console.log('Email sent successfully:', response);
    return response;
  } catch (error: any) {
    console.error('Detailed email sending error:', error.message);
    throw error;
  }
}
