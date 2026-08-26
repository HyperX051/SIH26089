-- Seed Admin User
INSERT INTO users (id, phone, role, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'ADMIN_PHONE', 'ADMIN', 'System Admin')
ON CONFLICT (phone) DO NOTHING;

-- Seed Customer User
INSERT INTO users (id, phone, role, name) 
VALUES ('22222222-2222-2222-2222-222222222222', '9876543210', 'CUSTOMER', 'Ramesh Kumar')
ON CONFLICT (phone) DO NOTHING;

-- Seed Worker User
INSERT INTO users (id, phone, role, name) 
VALUES ('33333333-3333-3333-3333-333333333333', '9123456789', 'WORKER', 'Suresh Plumber')
ON CONFLICT (phone) DO NOTHING;

-- Seed Worker Profile for the Worker User
INSERT INTO workers (user_id, service_radius_km, is_available, latitude, longitude, ncct_certified, tier, rating, total_jobs)
VALUES ('33333333-3333-3333-3333-333333333333', 15.0, true, 13.0827, 80.2707, true, 'SKILLED', 4.8, 150)
ON CONFLICT (user_id) DO NOTHING;
