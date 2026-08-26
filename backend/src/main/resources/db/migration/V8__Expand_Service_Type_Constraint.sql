-- Drop the old restrictive check constraint on service_type
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- Add a new constraint that includes all service types used in the UI
ALTER TABLE bookings ADD CONSTRAINT bookings_service_type_check
    CHECK (service_type IN (
        'PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'PAINTER', 'OTHER',
        'AC_REPAIR', 'CLEANING', 'PEST_CONTROL', 'CAR_MECHANIC',
        'APPLIANCE', 'ROOFING', 'HANDYMAN', 'LAPTOP_REPAIR',
        'WASHING_MACHINE', 'REFRIGERATOR', 'SOFA_CLEANING',
        'WATER_PURIFIER', 'GEYSER_REPAIR', 'BATHROOM_CLEANING'
    ));
