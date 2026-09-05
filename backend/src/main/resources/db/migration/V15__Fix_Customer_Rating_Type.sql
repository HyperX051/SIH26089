-- V15: Fix customer_rating column type from SMALLINT to INTEGER
ALTER TABLE bookings ALTER COLUMN customer_rating TYPE INTEGER;
