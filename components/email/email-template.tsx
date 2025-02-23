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

interface EmailTemplateProps {
  customerName: string;
  userName: string;
  daysWithoutContact: number;
  tasksList?: string; // Added for tasks
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  customerName,
  userName,
  daysWithoutContact,
  tasksList,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Daily Tasks Reminder</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Daily Tasks Reminder</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            You have the following tasks due today:
          </Text>
          <Section style={taskContainer}>
            <Text style={taskText}>
              {tasksList}
            </Text>
          </Section>
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

const taskContainer = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '5px',
  margin: '20px 0',
};

const taskText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
};
