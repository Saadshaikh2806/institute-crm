-- First disable RLS to avoid policy conflicts
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Enable insert for users" ON customers;
DROP POLICY IF EXISTS "Enable select for users" ON customers;
DROP POLICY IF EXISTS "Allow insert for customers" ON customers;
DROP POLICY IF EXISTS "Enable update for users" ON customers;
DROP POLICY IF EXISTS "Enable delete for users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON customers;

-- Drop the foreign key constraint
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_user_id_fkey;

-- Now safe to alter the column
ALTER TABLE customers
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add back the foreign key constraint
ALTER TABLE customers
ADD CONSTRAINT customers_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id);

-- Re-enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create strict user isolation policies
CREATE POLICY "Users can insert their own customers"
ON customers FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users can view their own customers"
ON customers FOR SELECT
USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can update their own customers"
ON customers FOR UPDATE
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users can delete their own customers"
ON customers FOR DELETE
USING (
    auth.uid() = user_id
);

-- Apply similar policies to interactions
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own interactions"
ON interactions FOR ALL
USING (
    auth.uid() = (
        SELECT user_id 
        FROM customers 
        WHERE id = customer_id
    )
);

-- Apply similar policies to tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tasks"
ON tasks FOR ALL
USING (
    auth.uid() = (
        SELECT user_id 
        FROM customers 
        WHERE id = customer_id
    )
);

-- Apply similar policies to tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tags"
ON tags FOR ALL
USING (
    auth.uid() = (
        SELECT user_id 
        FROM customers 
        WHERE id = customer_id
    )
);
