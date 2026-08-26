-- Replace ncct_certified with modern certification fields
ALTER TABLE workers RENAME COLUMN ncct_certified TO aadhaar_verified;

ALTER TABLE workers
    ADD COLUMN iti_certified       BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN nsqf_level          VARCHAR(10),
    ADD COLUMN trade_license_url   VARCHAR(255);
