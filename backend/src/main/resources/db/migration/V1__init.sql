-- ============================================================
-- SIH 2026: Cooperative Gig Services Platform
-- V1__init.sql — Full Schema Bootstrap
-- Supabase PostgreSQL 15 + PostGIS
-- ============================================================

-- Enable Extensions (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       VARCHAR(20)  UNIQUE NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('CUSTOMER', 'WORKER', 'ADMIN')),
    name        VARCHAR(150),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── WORKERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_radius_km   DECIMAL(6,2) DEFAULT 10.0,
    is_available        BOOLEAN     DEFAULT FALSE,
    latitude            DECIMAL(11,7),
    longitude           DECIMAL(11,7),
    ncct_certified      BOOLEAN     DEFAULT FALSE,
    tier                VARCHAR(20) DEFAULT 'BASIC' CHECK (tier IN ('BASIC', 'SKILLED', 'EXPERT')),
    rating              DECIMAL(3,2) DEFAULT 0.00,
    total_jobs          INT          DEFAULT 0,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT uq_worker_user UNIQUE (user_id)
);

-- PostGIS index for geo-spatial dispatch queries
CREATE INDEX IF NOT EXISTS idx_workers_location
    ON workers USING GIST (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    )
    WHERE is_available = TRUE AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id         UUID        NOT NULL REFERENCES users(id),
    worker_id           UUID        REFERENCES workers(id),
    service_type        VARCHAR(30) NOT NULL CHECK (service_type IN ('PLUMBER','ELECTRICIAN','CARPENTER','PAINTER','OTHER')),
    category_type       VARCHAR(20) NOT NULL DEFAULT 'PREDEFINED' CHECK (category_type IN ('PREDEFINED','CUSTOM')),
    custom_prompt_text  TEXT,
    booking_type        VARCHAR(20) NOT NULL DEFAULT 'INSTANT' CHECK (booking_type IN ('INSTANT','SCHEDULED')),
    status              VARCHAR(30) NOT NULL DEFAULT 'SEARCHING'
                            CHECK (status IN ('SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED_COMPENSATED','CANCELLED')),
    base_wage           DECIMAL(10,2) DEFAULT 0.00,
    material_cost       DECIMAL(10,2) DEFAULT 0.00,
    otp_hash            VARCHAR(255),
    otp_code            VARCHAR(6),
    scheduled_for       TIMESTAMPTZ,
    latitude            DECIMAL(11,7) NOT NULL,
    longitude           DECIMAL(11,7) NOT NULL,
    pincode             VARCHAR(10)   NOT NULL,
    address_text        TEXT          NOT NULL,
    created_at          TIMESTAMPTZ   DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker   ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);

-- ─── CANCELLATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cancellations (
    booking_id    UUID        PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    reason        TEXT,
    cancelled_by  VARCHAR(20) CHECK (cancelled_by IN ('CUSTOMER','WORKER','ADMIN')),
    fee           DECIMAL(10,2) DEFAULT 0.00,
    worker_payout DECIMAL(10,2) DEFAULT 0.00,
    created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── SOS ALERTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_alerts (
    id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id            UUID        REFERENCES bookings(id),
    user_id               UUID        NOT NULL REFERENCES users(id),
    latitude              DECIMAL(11,7) NOT NULL,
    longitude             DECIMAL(11,7) NOT NULL,
    telemetry             JSONB,
    status                VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
    dispatched_authorities BOOLEAN    DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COOPERATIVE LEDGER ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooperative_ledger (
    society_id              VARCHAR(60)   PRIMARY KEY,
    gross_turnover          DECIMAL(15,2) DEFAULT 0.00,
    commission_rate         DECIMAL(6,4)  DEFAULT 0.05,
    commission_reserve      DECIMAL(15,2) DEFAULT 0.00,
    dividend_pool_balance   DECIMAL(15,2) DEFAULT 0.00,
    eligible_worker_count   INT           DEFAULT 0,
    updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── Seed Cooperative Ledger ──────────────────────────────────────────────────
INSERT INTO cooperative_ledger
    (society_id, gross_turnover, commission_reserve, dividend_pool_balance, eligible_worker_count)
VALUES
    ('soc_chennai_01', 450000.00, 22500.00, 18000.00, 84)
ON CONFLICT (society_id) DO NOTHING;
