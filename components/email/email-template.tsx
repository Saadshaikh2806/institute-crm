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
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  customerName,
  userName,
  daysWithoutContact,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Follow-up Reminder for {customerName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Follow-up Reminder</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            This is a reminder that your lead <strong>{customerName}</strong> hasn't been contacted in {daysWithoutContact} days.
          </Text>
          <Section style={buttonContainer}>
            <Text style={text}>
              Please follow up with them to maintain engagement and move the lead forward.
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
