-- Drop existing table and index if they exist
DROP INDEX IF EXISTS idx_email_logs_user_email;
DROP TABLE IF EXISTS email_logs CASCADE;

-- Create a table to track email sends
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for quick lookups
CREATE INDEX idx_email_logs_user_email ON email_logs(user_email);
