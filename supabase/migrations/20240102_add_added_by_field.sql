-- Add added_by column to customers table
ALTER TABLE customers
ADD COLUMN added_by TEXT NOT NULL DEFAULT 'Unknown';

-- Remove the default after adding the column
ALTER TABLE customers
ALTER COLUMN added_by DROP DEFAULT;
