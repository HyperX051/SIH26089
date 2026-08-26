-- ============================================================
-- SIH 2026: Cooperative Gig Services Platform
-- V2__seed_tier2_tier3_data.sql — Seed Data for Tier 2 & Tier 3 Indian Cities
-- ============================================================

-- ─── 1. COOPERATIVE SOCIETIES (TIER 2 & TIER 3 HUBS) ─────────
INSERT INTO cooperative_ledger 
    (society_id, gross_turnover, commission_rate, commission_reserve, dividend_pool_balance, eligible_worker_count)
VALUES
    -- Tier 2 Hubs
    ('soc_coimbatore_01', 380000.00, 0.0500, 19000.00, 15200.00, 68),
    ('soc_indore_01',     420000.00, 0.0500, 21000.00, 16800.00, 74),
    ('soc_jaipur_01',     490000.00, 0.0500, 24500.00, 19600.00, 88),
    ('soc_kochi_01',      360000.00, 0.0500, 18000.00, 14400.00, 62),
    ('soc_vizag_01',      340000.00, 0.0500, 17000.00, 13600.00, 58),
    ('soc_chandigarh_01', 510000.00, 0.0500, 25500.00, 20400.00, 92),
    ('soc_bhubaneswar_01',290000.00, 0.0500, 14500.00, 11600.00, 50),
    ('soc_vadodara_01',   375000.00, 0.0500, 18750.00, 15000.00, 65),
    ('soc_lucknow_01',    460000.00, 0.0500, 23000.00, 18400.00, 80),
    ('soc_nagpur_01',     395000.00, 0.0500, 19750.00, 15800.00, 70),

    -- Tier 3 Hubs
    ('soc_madurai_01',    240000.00, 0.0500, 12000.00,  9600.00, 42),
    ('soc_warangal_01',   210000.00, 0.0500, 10500.00,  8400.00, 38),
    ('soc_guntur_01',     195000.00, 0.0500,  9750.00,  7800.00, 35),
    ('soc_salem_01',      225000.00, 0.0500, 11250.00,  9000.00, 40),
    ('soc_udaipur_01',    260000.00, 0.0500, 13000.00, 10400.00, 45),
    ('soc_kolhapur_01',   230000.00, 0.0500, 11500.00,  9200.00, 41),
    ('soc_jabalpur_01',   205000.00, 0.0500, 10250.00,  8200.00, 36),
    ('soc_siliguri_01',   185000.00, 0.0500,  9250.00,  7400.00, 32),
    ('soc_aligarh_01',    215000.00, 0.0500, 10750.00,  8600.00, 37),
    ('soc_hubli_01',      250000.00, 0.0500, 12500.00, 10000.00, 44)
ON CONFLICT (society_id) DO NOTHING;


-- ─── 2. SEED WORKER USERS (TIER 2 & TIER 3 CITIES) ────────────
-- Use fixed UUIDs for deterministic seed data
INSERT INTO users (id, phone, role, name)
VALUES
    -- Coimbatore (Tier 2) - Tamil Nadu
    ('a0000001-0000-0000-0000-000000000001', '+919842011001', 'WORKER', 'Karthik Subramanian'),
    ('a0000001-0000-0000-0000-000000000002', '+919842011002', 'CUSTOMER', 'Deepa Jayaraman'),

    -- Indore (Tier 2) - Madhya Pradesh
    ('a0000002-0000-0000-0000-000000000001', '+919826022001', 'WORKER', 'Rajesh Patidar'),
    ('a0000002-0000-0000-0000-000000000002', '+919826022002', 'CUSTOMER', 'Pooja Verma'),

    -- Jaipur (Tier 2) - Rajasthan
    ('a0000003-0000-0000-0000-000000000001', '+919829033001', 'WORKER', 'Mukesh Sharma'),
    ('a0000003-0000-0000-0000-000000000002', '+919829033002', 'CUSTOMER', 'Sunita Meena'),

    -- Kochi (Tier 2) - Kerala
    ('a0000004-0000-0000-0000-000000000001', '+919847044001', 'WORKER', 'Biju Varghese'),
    ('a0000004-0000-0000-0000-000000000002', '+919847044002', 'CUSTOMER', 'Ananya Menon'),

    -- Visakhapatnam (Tier 2) - Andhra Pradesh
    ('a0000005-0000-0000-0000-000000000001', '+919848055001', 'WORKER', 'Srinivasa Rao Appari'),
    ('a0000005-0000-0000-0000-000000000002', '+919848055002', 'CUSTOMER', 'Venkata Lakshmi'),

    -- Madurai (Tier 3) - Tamil Nadu
    ('a0000006-0000-0000-0000-000000000001', '+919843066001', 'WORKER', 'Muthukumar Pandian'),
    ('a0000006-0000-0000-0000-000000000002', '+919843066002', 'CUSTOMER', 'Meenakshi Sundaram'),

    -- Warangal (Tier 3) - Telangana
    ('a0000007-0000-0000-0000-000000000001', '+919849077001', 'WORKER', 'Thirupathi Goud'),
    ('a0000007-0000-0000-0000-000000000002', '+919849077002', 'CUSTOMER', 'Swathi Reddy'),

    -- Guntur (Tier 3) - Andhra Pradesh
    ('a0000008-0000-0000-0000-000000000001', '+919848088001', 'WORKER', 'Nagaraju Kamma'),
    ('a0000008-0000-0000-0000-000000000002', '+919848088002', 'CUSTOMER', 'Sai Prasanth'),

    -- Udaipur (Tier 3) - Rajasthan
    ('a0000009-0000-0000-0000-000000000001', '+919829099001', 'WORKER', 'Bhanwar Singh Rathore'),
    ('a0000009-0000-0000-0000-000000000002', '+919829099002', 'CUSTOMER', 'Kavita Joshi'),

    -- Siliguri (Tier 3) - West Bengal
    ('a0000010-0000-0000-0000-000000000001', '+919832100001', 'WORKER', 'Pradip Roy'),
    ('a0000010-0000-0000-0000-000000000002', '+919832100002', 'CUSTOMER', 'Debasree Das')
ON CONFLICT (phone) DO NOTHING;


-- ─── 3. WORKER PROFILES WITH ACCURATE GPS COORDINATES ─────────
INSERT INTO workers 
    (id, user_id, service_radius_km, is_available, latitude, longitude, ncct_certified, tier, rating, total_jobs)
VALUES
    -- Coimbatore: RS Puram (11.0168° N, 76.9558° E)
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 12.0, TRUE, 11.0168440, 76.9558320, TRUE,  'EXPERT',  4.85, 142),

    -- Indore: Vijay Nagar (22.7533° N, 75.8937° E)
    ('b0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 10.0, TRUE, 22.7532850, 75.8936960, TRUE,  'SKILLED', 4.70, 98),

    -- Jaipur: Mansarovar (26.8530° N, 75.7671° E)
    ('b0000003-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 15.0, TRUE, 26.8530220, 75.7671240, TRUE,  'EXPERT',  4.90, 210),

    -- Kochi: Kakkanad (10.0159° N, 76.3419° E)
    ('b0000004-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000001', 10.0, TRUE, 10.0158600, 76.3418670, FALSE, 'SKILLED', 4.65, 76),

    -- Visakhapatnam: MVP Colony (17.7410° N, 83.3364° E)
    ('b0000005-0000-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 8.0,  TRUE, 17.7410120, 83.3364150, TRUE,  'BASIC',   4.50, 34),

    -- Madurai: KK Nagar (9.9252° N, 78.1458° E)
    ('b0000006-0000-0000-0000-000000000001', 'a0000006-0000-0000-0000-000000000001', 10.0, TRUE, 9.9252310,  78.1458230, TRUE,  'EXPERT',  4.80, 115),

    -- Warangal: Hanamkonda (17.9975° N, 79.5760° E)
    ('b0000007-0000-0000-0000-000000000001', 'a0000007-0000-0000-0000-000000000001', 12.0, TRUE, 17.9975410, 79.5760440, FALSE, 'SKILLED', 4.55, 52),

    -- Guntur: Brodipet (16.3067° N, 80.4365° E)
    ('b0000008-0000-0000-0000-000000000001', 'a0000008-0000-0000-0000-000000000001', 10.0, TRUE, 16.3066520, 80.4365410, TRUE,  'SKILLED', 4.60, 63),

    -- Udaipur: Hiran Magri (24.5713° N, 73.7088° E)
    ('b0000009-0000-0000-0000-000000000001', 'a0000009-0000-0000-0000-000000000001', 15.0, TRUE, 24.5712770, 73.7088490, TRUE,  'EXPERT',  4.92, 180),

    -- Siliguri: Sevoke Road (26.7271° N, 88.4312° E)
    ('b0000010-0000-0000-0000-000000000001', 'a0000010-0000-0000-0000-000000000001', 8.0,  TRUE, 26.7271030, 88.4312150, FALSE, 'BASIC',   4.40, 29)
ON CONFLICT (user_id) DO NOTHING;


-- ─── 4. SAMPLE ACTIVE & COMPLETED BOOKINGS ────────────────────
INSERT INTO bookings
    (id, customer_id, worker_id, service_type, category_type, booking_type, status, base_wage, material_cost, otp_code, latitude, longitude, pincode, address_text)
VALUES
    -- Coimbatore Booking (Completed)
    ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001',
     'ELECTRICIAN', 'PREDEFINED', 'INSTANT', 'COMPLETED', 450.00, 120.00, '382910', 11.0185000, 76.9601000, '641002', 'Plot 45, D.B. Road, RS Puram, Coimbatore, TN'),

    -- Indore Booking (In Progress)
    ('c0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000001',
     'PLUMBER', 'PREDEFINED', 'INSTANT', 'IN_PROGRESS', 350.00, 80.00, '948210', 22.7540000, 75.8950000, '452010', 'Flat 302, Scheme 54, Vijay Nagar, Indore, MP'),

    -- Madurai Booking (Searching / Instant Dispatch)
    ('c0000003-0000-0000-0000-000000000001', 'a0000006-0000-0000-0000-000000000002', NULL,
     'CARPENTER', 'CUSTOM', 'INSTANT', 'SEARCHING', 500.00, 0.00, '519302', 9.9260000, 78.1470000, '625020', 'Door 12, 80 Feet Road, Anna Nagar, Madurai, TN'),

    -- Jaipur Booking (Completed)
    ('c0000004-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000002', 'b0000003-0000-0000-0000-000000000001',
     'PAINTER', 'PREDEFINED', 'SCHEDULED', 'COMPLETED', 1200.00, 450.00, '738192', 26.8540000, 75.7680000, '302020', 'Sector 7, Mansarovar, Jaipur, RJ')
ON CONFLICT (id) DO NOTHING;
