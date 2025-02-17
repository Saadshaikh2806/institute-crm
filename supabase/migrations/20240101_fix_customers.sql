-- Add user_id column if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Make RLS more permissive for testing
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;

-- Create a simple insert policy that just checks for authenticated users
CREATE POLICY "Enable insert for authenticated users only"
ON customers FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create a simple select policy
CREATE POLICY "Enable read access for authenticated users"
ON customers FOR SELECT
USING (auth.role() = 'authenticated');
