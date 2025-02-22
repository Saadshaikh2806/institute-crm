-- Create tables for the CRM system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create crm_users table
CREATE TABLE crm_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    full_name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_user FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    school VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    interest_level INTEGER DEFAULT 0,
    budget_fit INTEGER DEFAULT 0,
    added_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    duedate TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create interactions table
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX idx_tasks_duedate ON tasks(duedate);
CREATE INDEX idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX idx_tags_customer_id ON tags(customer_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create policies for crm_users
CREATE POLICY "Users can view their own profile"
    ON crm_users FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
    ON crm_users FOR UPDATE
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Admin users can view all profiles"
    ON crm_users FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE POLICY "Admin users can update all profiles"
    ON crm_users FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    ));

-- Create policies
CREATE POLICY "Users can view their own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view interactions for their customers"
    ON interactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = interactions.customer_id
        AND customers.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert interactions for their customers"
    ON interactions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = interactions.customer_id
        AND customers.user_id = auth.uid()
    ));

CREATE POLICY "Users can view tags for their customers"
    ON tags FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = tags.customer_id
        AND customers.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert tags for their customers"
    ON tags FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = tags.customer_id
        AND customers.user_id = auth.uid()
    ));

-- Insert sample data for testing
-- Note: These auth.users must exist in your auth schema
INSERT INTO auth.users (id, email) VALUES
    ('d0fc4c64-a3c6-4f99-9641-0d0fd4e2da01', 'admin@institute-crm.com'),
    ('e7d5c658-d2ef-4c79-8d9c-bed45e85d3f5', 'sarah.manager@institute-crm.com'),
    ('f8b4c342-e56a-4f87-b2e9-b8c4f3b2d6a2', 'john.advisor@institute-crm.com'),
    ('a2c9e4d1-b8f3-4c6a-9d2e-f5a7c8b9d3e1', 'emma.counselor@institute-crm.com'),
    ('c5d7b3a9-e2f1-4d8c-b6a4-9c8e5f3d2a1b', 'michael.recruiter@institute-crm.com');

-- Insert corresponding CRM users
INSERT INTO crm_users (auth_user_id, role, full_name, email, is_active, last_login) VALUES
    ('d0fc4c64-a3c6-4f99-9641-0d0fd4e2da01', 'admin', 'System Administrator', 'admin@institute-crm.com', true, CURRENT_TIMESTAMP),
    ('e7d5c658-d2ef-4c79-8d9c-bed45e85d3f5', 'user', 'Sarah Thompson', 'sarah.manager@institute-crm.com', true, CURRENT_TIMESTAMP),
    ('f8b4c342-e56a-4f87-b2e9-b8c4f3b2d6a2', 'user', 'John Martinez', 'john.advisor@institute-crm.com', true, CURRENT_TIMESTAMP),
    ('a2c9e4d1-b8f3-4c6a-9d2e-f5a7c8b9d3e1', 'user', 'Emma Wilson', 'emma.counselor@institute-crm.com', true, CURRENT_TIMESTAMP),
    ('c5d7b3a9-e2f1-4d8c-b6a4-9c8e5f3d2a1b', 'user', 'Michael Chen', 'michael.recruiter@institute-crm.com', false, NULL);