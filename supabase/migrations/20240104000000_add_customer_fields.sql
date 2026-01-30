-- Add new fields to customers table for Sales/Marketing Leads tracking

-- STD/Board field (e.g., 10th, 12th, etc.)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS std_board VARCHAR(100);

-- Counsellor Name
ALTER TABLE customers ADD COLUMN IF NOT EXISTS counsellor_name VARCHAR(255);

-- Team (Sangeeta or Kavita)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS team VARCHAR(100);

-- Remarks
ALTER TABLE customers ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create index for team filtering
CREATE INDEX IF NOT EXISTS idx_customers_team ON customers(team);
