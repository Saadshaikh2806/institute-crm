import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  debug: true, // Enable debug logging
  logger: true // Enable logger
});

export const sendTaskEmail = async (to: string, tasks: any[]) => {
  const timestamp = new Date().toLocaleString();
  
  // Array of sarcastic messages for no tasks
  const sarcasticMessages = [
    "Wow, absolutely nothing to do today! Living the dream, aren't we? 🎉",
    "Clear schedule alert! Time to pretend you're busy! 😴",
    "No tasks today - did everyone suddenly become super efficient? 🤔",
    "Empty task list! Quick, look busy before someone assigns something! 💨",
    "Congratulations! You've achieved peak procrastination! 🏆",
    "No tasks? Time to master the art of looking productive while doing nothing! 🎭"
  ];

  const randomSarcasm = sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)];
  
  // Verify transporter configuration
  try {
    await emailTransporter.verify();
    console.log('Email transporter verified successfully');
  } catch (error) {
    console.error('Email transporter verification failed:', error);
    throw error;
  }

  const htmlContent = `
    <h2>Tasks Update - ${timestamp}</h2>
    <div style="font-family: Arial, sans-serif;">
      ${tasks.length === 0 ? `
        <div style="margin: 20px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; text-align: center; background-color: #f9f9f9;">
          <h3 style="color: #2c3e50; margin-bottom: 10px;">🎉 Task List Empty! 🎉</h3>
          <p style="color: #34495e; font-size: 16px;">${randomSarcasm}</p>
        </div>
      ` : tasks.map(task => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
          <h3 style="color: #2c3e50; margin: 0 0 10px 0;">${task.title}</h3>
          <p style="color: #34495e; margin: 5px 0;"><strong>Description:</strong> ${task.description || 'No description'}</p>
          <p style="color: #7f8c8d;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleString()}</p>
          <p style="color: #7f8c8d;"><strong>Priority:</strong> ${task.priority || 'Not set'}</p>
          ${task.status ? `<p style="color: #7f8c8d;"><strong>Status:</strong> ${task.status}</p>` : ''}
          ${task.customers ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
              <p style="color: #2c3e50; margin: 5px 0;"><strong>Customer:</strong> ${task.customers.name}</p>
              <p style="color: #7f8c8d; margin: 5px 0;"><strong>Contact:</strong> ${task.customers.email}</p>
              ${task.customers.phone ? `<p style="color: #7f8c8d; margin: 5px 0;"><strong>Phone:</strong> ${task.customers.phone}</p>` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
      <div style="margin-top: 20px; font-size: 12px; color: #999;">
        Generated at: ${timestamp}
      </div>
    </div>
  `;

  const mailOptions = {
    from: {
      name: 'Task Management System',
      address: process.env.GMAIL_USER!
    },
    to,
    subject: `Tasks Update - ${timestamp}`,
    html: htmlContent,
    headers: {
      'X-Generated-At': timestamp,
      'Cache-Control': 'no-cache',
      'X-Priority': '1'
    }
  };

  console.log('Sending email with options:', {
    to: mailOptions.to,
    from: mailOptions.from,
    subject: mailOptions.subject
  });

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};
