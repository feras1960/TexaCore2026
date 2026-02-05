-- Add status column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing companies to have 'active' status if null
UPDATE companies 
SET status = 'active' 
WHERE status IS NULL;

-- Comment on column
COMMENT ON COLUMN companies.status IS 'active, suspended, deleted';
