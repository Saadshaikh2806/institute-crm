-- Create users table for CRM access control
CREATE TABLE crm_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES crm_users(id),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create initial admin user (replace with your email)
INSERT INTO crm_users (email, role, is_active) 
VALUES ('your-admin-email@example.com', 'admin', true);

-- Create a test user (optional)
INSERT INTO crm_users (email, role, is_active) 
VALUES ('test-user@example.com', 'user', true); 