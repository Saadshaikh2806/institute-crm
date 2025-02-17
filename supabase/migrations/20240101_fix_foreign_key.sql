-- First drop the existing foreign key constraint
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_user_id_fkey;

-- Update the user_id column to reference auth.users instead of crm_users
ALTER TABLE customers
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE customers
ADD CONSTRAINT customers_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id);

-- Update RLS policies to use auth.uid()
CREATE OR REPLACE POLICY "Users can insert their own customers"
ON customers FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

CREATE OR REPLACE POLICY "Users can view their own customers"
ON customers FOR SELECT
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM crm_users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
