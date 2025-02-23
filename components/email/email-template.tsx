import * as React from 'react';
import {
  Html,
  Body,
  Head,
  Heading,
  Hr,
  Container,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PendingTask {
  title: string;
  dueDate: string;
  customerName?: string;
}

interface EmailTemplateProps {
  customerName: string;
  userName: string;
  daysWithoutContact: number;
  pendingTasks: PendingTask[];
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  customerName,
  userName,
  daysWithoutContact,
  pendingTasks
}) => {
  return (
    <Html>
      <Head />
      <Preview>CRM Daily Update: Leads and Tasks</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Daily CRM Update</Heading>
          <Text style={text}>Hello {userName},</Text>
          
          {customerName && (
            <Section>
              <Text style={text}>
                You have high-priority leads that need attention: <strong>{customerName}</strong>
              </Text>
            </Section>
          )}

          {pendingTasks.length > 0 && (
            <Section>
              <Text style={subheading}>Pending Tasks Due Soon:</Text>
              {pendingTasks.map((task, index) => (
                <Text key={index} style={taskStyle}>
                  • {task.title} {task.customerName ? `(${task.customerName})` : ''}<br />
                  <span style={dateStyle}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </Text>
              ))}
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>ADCI CRM System</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const buttonContainer = {
  padding: '27px 0 27px',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
};

const subheading = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '20px',
};

const taskStyle = {
  color: '#444',
  fontSize: '14px',
  marginBottom: '8px',
};

const dateStyle = {
  color: '#666',
  fontSize: '12px',
  marginLeft: '15px',
};
