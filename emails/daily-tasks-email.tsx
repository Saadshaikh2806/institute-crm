import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TaskEmailProps {
  data: {
    customerTasks: Array<{
      customerName: string;
      customerPhone: string;
      tasks: Array<{
        title: string;
        dueDate: string;
        completed: boolean;
      }>;
    }>;
  };
  originalRecipient?: string;
}

export function DailyTasksEmail({ data, originalRecipient }: TaskEmailProps) {
  const sarcasmMessages = [
    "Wow, looks like someone's having a peaceful day! No tasks... must be nice.",
    "No tasks today? Is this a vacation I wasn't informed about? 🏖️",
    "Empty task list... Living the dream, aren't we? 😴",
    "Task list as empty as a Monday morning coffee pot. Interesting... 🤔"
  ];

  const randomSarcasm = sarcasmMessages[Math.floor(Math.random() * sarcasmMessages.length)];

  return (
    <Html>
      <Head />
      <Preview>Your Daily CRM Tasks Summary</Preview>
      <Body style={main}>
        <Container style={container}>
          {originalRecipient && (
            <Text style={testMode}>
              Test Mode - Original recipient: {originalRecipient}
            </Text>
          )}
          <Heading style={h1}>Daily Tasks Summary</Heading>
          
          {data.customerTasks.length === 0 ? (
            <Text style={sarcasmStyle}>{randomSarcasm}</Text>
          ) : (
            <>
              <Text style={text}>Here are your tasks for today:</Text>
              {data.customerTasks.map((customer, i) => (
                <Section key={i} style={customerSection}>
                  <Heading style={h2}>{customer.customerName}</Heading>
                  <Text style={text}>Phone: {customer.customerPhone}</Text>
                  
                  {customer.tasks.map((task, j) => (
                    <Text key={j} style={taskStyle(task.completed)}>
                      • {task.title} (Due: {task.dueDate})
                      {task.completed ? ' ✓' : ''}
                    </Text>
                  ))}
                </Section>
              ))}
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const h2 = {
  color: '#444',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '20px 0',
};

const text = {
  color: '#555',
  fontSize: '16px',
  margin: '4px 0',
};

const customerSection = {
  margin: '20px 0',
  padding: '20px',
  borderLeft: '4px solid #0070f3',
  backgroundColor: '#f5f5f5',
};

const taskStyle = (completed: boolean) => ({
  color: completed ? '#666' : '#333',
  textDecoration: completed ? 'line-through' : 'none',
  margin: '8px 0',
});

const testMode = {
  backgroundColor: '#fff3cd',
  color: '#856404',
  padding: '10px',
  marginBottom: '20px',
  borderRadius: '4px',
  fontSize: '14px',
};

const sarcasmStyle = {
  color: '#666',
  fontSize: '18px',
  margin: '20px 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
};
