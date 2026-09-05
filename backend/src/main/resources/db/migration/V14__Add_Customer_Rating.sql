-- V14: Add customer rating column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5);
