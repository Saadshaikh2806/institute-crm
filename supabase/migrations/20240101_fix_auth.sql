-- Modify customers table to use auth.uid() directly
ALTER TABLE customers
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE customers
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can select their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;

-- Create simplified policies
CREATE POLICY "Enable basic auth"
ON customers
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users"
ON customers FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = user_id
);

CREATE POLICY "Enable select for authenticated users"
ON customers FOR SELECT
USING (
    auth.role() = 'authenticated' AND
    (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM crm_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ))
);
