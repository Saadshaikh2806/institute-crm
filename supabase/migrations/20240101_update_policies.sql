-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can only see their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

-- Create comprehensive policies
CREATE POLICY "Users can select their own customers"
ON customers FOR SELECT
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM crm_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;

-- Create a more permissive insert policy
CREATE POLICY "Users can insert their own customers"
ON customers FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL -- Just check if user is authenticated
);

CREATE POLICY "Users can update their own customers"
ON customers FOR UPDATE
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM crm_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

CREATE POLICY "Users can delete their own customers"
ON customers FOR DELETE
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM crm_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
