-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for current UTC timestamp
CREATE OR REPLACE FUNCTION now_utc() RETURNS timestamptz AS $$
  SELECT timezone('utc', now());
$$ LANGUAGE sql STABLE;

------------------------------------------------------------
-- Trigger function to set username from email if not provided
------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_username_from_email() RETURNS trigger AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := split_part(NEW.email, '@', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------
-- Create crm_users table with access control fields
------------------------------------------------------------
CREATE TABLE crm_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  username TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc(),
  created_by UUID REFERENCES crm_users(id),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Add trigger to automatically set username before insert
CREATE TRIGGER trg_set_username
BEFORE INSERT ON crm_users
FOR EACH ROW
EXECUTE FUNCTION set_username_from_email();

-- Insert initial users (update email values as needed)
INSERT INTO crm_users (email, role, is_active) 
VALUES ('your-admin-email@example.com', 'admin', TRUE);

INSERT INTO crm_users (email, role, is_active) 
VALUES ('test-user@example.com', 'user', TRUE);

------------------------------------------------------------
-- Create customers table
------------------------------------------------------------
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  school TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('lead', 'active', 'inactive')),
  lead_score INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER NOT NULL DEFAULT 0,
  interest_level INTEGER NOT NULL DEFAULT 0,
  budget_fit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc()
);

------------------------------------------------------------
-- Trigger function to update the updated_at field on changes
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_customers_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now_utc();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at on any update to customers
CREATE TRIGGER trg_update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

------------------------------------------------------------
-- Create interactions table
------------------------------------------------------------
CREATE TABLE interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting')),
  details TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc()
);

------------------------------------------------------------
-- Create tasks table
------------------------------------------------------------
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc()
);

------------------------------------------------------------
-- Create tags table
------------------------------------------------------------
CREATE TABLE tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now_utc()
);
