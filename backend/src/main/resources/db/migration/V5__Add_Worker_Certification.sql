-- Add certification_url and approval_status to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS certification_url VARCHAR(255);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING';
