-- V3__Add_Email_Password.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

INSERT INTO users (id, phone, role, name, email, password, created_at)
VALUES (gen_random_uuid(), '0000000000', 'ADMIN', 'Super Admin', 'admin@cooperative.gov.in', '{noop}admin123', NOW())
ON CONFLICT (phone) DO UPDATE SET email = 'admin@cooperative.gov.in', password = '{noop}admin123';
