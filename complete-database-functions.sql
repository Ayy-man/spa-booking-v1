-- =====================================================
-- Complete Database Functions and Optimizations
-- =====================================================
-- Run this AFTER the main database setup script
-- This adds all functions, triggers, indexes, and views
-- =====================================================

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- Staff profile indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employee_id ON staff_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON staff_profiles(is_active) WHERE is_active = true;

-- Staff schedule indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_status ON staff_schedules(status);

-- Service indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_deleted ON services(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_drainage ON services(requires_specialized_drainage) WHERE requires_specialized_drainage = true;

-- Room indexes
CREATE INDEX IF NOT EXISTS idx_rooms_number ON rooms(number);
CREATE INDEX IF NOT EXISTS idx_rooms_capacity ON rooms(bed_capacity);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_drainage ON rooms(has_specialized_drainage) WHERE has_specialized_drainage = true;

-- Booking indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(status) WHERE status NOT IN ('cancelled', 'completed');

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_room_date_time ON bookings(room_id, booking_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date_time ON bookings(staff_id, booking_date, start_time, end_time);

-- Enhanced date range queries for DatePicker (next 14 days)
CREATE INDEX IF NOT EXISTS idx_bookings_date_range_active 
ON bookings(booking_date, status) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Optimized composite index for availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_availability_lookup 
ON bookings(booking_date, start_time, end_time, room_id, staff_id, status) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Staff schedule optimization for daily/weekly views
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date_range 
ON staff_schedules(date, staff_id, status) 
WHERE status = 'available';

-- Room availability optimization
CREATE INDEX IF NOT EXISTS idx_bookings_room_time_conflict 
ON bookings(room_id, booking_date, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Staff availability optimization
CREATE INDEX IF NOT EXISTS idx_bookings_staff_time_conflict 
ON bookings(staff_id, booking_date, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Booking history indexes
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_changed_by ON booking_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_booking_history_created_at ON booking_history(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON staff_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_schedules_updated_at ON staff_schedules;
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to check room availability for booking
CREATE OR REPLACE FUNCTION check_room_availability(
    p_room_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
        AND booking_date = p_booking_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check staff availability for booking
CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if staff has conflicting bookings
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
        AND booking_date = p_booking_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND (start_time < p_end_time AND end_time > p_start_time)
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if staff is scheduled to work
    RETURN EXISTS (
        SELECT 1 FROM staff_schedules
        WHERE staff_id = p_staff_id
        AND date = p_booking_date
        AND status = 'available'
        AND start_time <= p_start_time
        AND end_time >= p_end_time
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate service room compatibility
CREATE OR REPLACE FUNCTION validate_service_room_compatibility(
    p_service_id UUID,
    p_room_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    service_record RECORD;
    room_record RECORD;
BEGIN
    -- Get service requirements
    SELECT requires_specialized_drainage, min_room_capacity, allowed_room_ids
    INTO service_record
    FROM services
    WHERE id = p_service_id AND is_active = true AND deleted_at IS NULL;
    
    -- Return false if service not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get room capabilities
    SELECT bed_capacity, has_specialized_drainage
    INTO room_record
    FROM rooms
    WHERE id = p_room_id AND is_active = true;
    
    -- Return false if room not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check room capacity
    IF room_record.bed_capacity < service_record.min_room_capacity THEN
        RETURN FALSE;
    END IF;
    
    -- Check drainage requirement
    IF service_record.requires_specialized_drainage AND NOT room_record.has_specialized_drainage THEN
        RETURN FALSE;
    END IF;
    
    -- Check allowed rooms restriction
    IF service_record.allowed_room_ids IS NOT NULL AND NOT (p_room_id = ANY(service_record.allowed_room_ids)) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fast date range availability check for DatePicker
CREATE OR REPLACE FUNCTION get_date_availability_summary(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_days INTEGER DEFAULT 14
)
RETURNS TABLE (
    date_value DATE,
    total_slots INTEGER,
    booked_slots INTEGER,
    available_slots INTEGER,
    has_availability BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            p_start_date, 
            p_start_date + INTERVAL '1 day' * (p_days - 1), 
            '1 day'::interval
        )::date AS date_val
    ),
    staff_capacity AS (
        SELECT 
            ss.date,
            COUNT(*) * 12 as total_possible_slots -- Assuming 12 possible slots per staff per day
        FROM staff_schedules ss
        WHERE ss.date BETWEEN p_start_date AND p_start_date + INTERVAL '1 day' * (p_days - 1)
        AND ss.status = 'available'
        GROUP BY ss.date
    ),
    bookings_count AS (
        SELECT 
            b.booking_date,
            COUNT(*) as booked_count
        FROM bookings b
        WHERE b.booking_date BETWEEN p_start_date AND p_start_date + INTERVAL '1 day' * (p_days - 1)
        AND b.status NOT IN ('cancelled', 'no_show')
        GROUP BY b.booking_date
    )
    SELECT 
        ds.date_val,
        COALESCE(sc.total_possible_slots, 0) as total_slots,
        COALESCE(bc.booked_count, 0) as booked_slots,
        GREATEST(0, COALESCE(sc.total_possible_slots, 0) - COALESCE(bc.booked_count, 0)) as available_slots,
        GREATEST(0, COALESCE(sc.total_possible_slots, 0) - COALESCE(bc.booked_count, 0)) > 0 as has_availability
    FROM date_series ds
    LEFT JOIN staff_capacity sc ON ds.date_val = sc.date
    LEFT JOIN bookings_count bc ON ds.date_val = bc.booking_date
    ORDER BY ds.date_val;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fast time slot availability for specific date (TimeSlotPicker)
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_date DATE,
    p_service_id UUID DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL
)
RETURNS TABLE (
    time_slot TIME,
    available_staff_count INTEGER,
    available_room_count INTEGER,
    is_available BOOLEAN,
    suggested_staff_id UUID,
    suggested_room_id UUID
) AS $$
DECLARE
    service_duration INTEGER;
    service_room_requirements RECORD;
BEGIN
    -- Get service details if provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration_minutes, requires_specialized_drainage, min_room_capacity, allowed_room_ids
        INTO service_duration, service_room_requirements.requires_specialized_drainage, 
             service_room_requirements.min_room_capacity, service_room_requirements.allowed_room_ids
        FROM services 
        WHERE id = p_service_id;
    ELSE
        service_duration := 60; -- Default duration
    END IF;

    RETURN QUERY
    WITH time_slots AS (
        -- Generate 30-minute time slots from 9 AM to 7 PM
        SELECT generate_series(
            '09:00'::time,
            '19:00'::time,
            '30 minutes'::interval
        )::time AS slot_time
    ),
    staff_available AS (
        SELECT 
            ts.slot_time,
            sp.id as staff_id,
            sp.user_id
        FROM time_slots ts
        CROSS JOIN staff_profiles sp
        JOIN staff_schedules ss ON sp.id = ss.staff_id
        WHERE ss.date = p_date
        AND ss.status = 'available'
        AND ss.start_time <= ts.slot_time
        AND ss.end_time >= (ts.slot_time + (service_duration || ' minutes')::interval)::time
        AND sp.is_active = true
        AND (p_staff_id IS NULL OR sp.id = p_staff_id)
        -- Check no conflicting bookings
        AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.staff_id = sp.id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND b.start_time < (ts.slot_time + (service_duration || ' minutes')::interval)::time
            AND b.end_time > ts.slot_time
        )
    ),
    rooms_available AS (
        SELECT 
            ts.slot_time,
            r.id as room_id
        FROM time_slots ts
        CROSS JOIN rooms r
        WHERE r.is_active = true
        AND (p_room_id IS NULL OR r.id = p_room_id)
        -- Check service room compatibility if service specified
        AND (p_service_id IS NULL OR validate_service_room_compatibility(p_service_id, r.id))
        -- Check no conflicting bookings
        AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND b.start_time < (ts.slot_time + (service_duration || ' minutes')::interval)::time
            AND b.end_time > ts.slot_time
        )
    )
    SELECT 
        ts.slot_time,
        COALESCE(sa_count.staff_count, 0) as available_staff_count,
        COALESCE(ra_count.room_count, 0) as available_room_count,
        (COALESCE(sa_count.staff_count, 0) > 0 AND COALESCE(ra_count.room_count, 0) > 0) as is_available,
        sa_first.staff_id as suggested_staff_id,
        ra_first.room_id as suggested_room_id
    FROM time_slots ts
    LEFT JOIN (
        SELECT slot_time, COUNT(*) as staff_count
        FROM staff_available
        GROUP BY slot_time
    ) sa_count ON ts.slot_time = sa_count.slot_time
    LEFT JOIN (
        SELECT slot_time, COUNT(*) as room_count
        FROM rooms_available
        GROUP BY slot_time
    ) ra_count ON ts.slot_time = ra_count.slot_time
    LEFT JOIN (
        SELECT DISTINCT ON (slot_time) slot_time, staff_id
        FROM staff_available
        ORDER BY slot_time, staff_id
    ) sa_first ON ts.slot_time = sa_first.slot_time
    LEFT JOIN (
        SELECT DISTINCT ON (slot_time) slot_time, room_id
        FROM rooms_available
        ORDER BY slot_time, room_id
    ) ra_first ON ts.slot_time = ra_first.slot_time
    ORDER BY ts.slot_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- BOOKING AUDIT TRIGGER
-- =====================================================

-- Function to log booking status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO booking_history (
            booking_id,
            changed_by,
            old_status,
            new_status,
            change_reason,
            change_details
        ) VALUES (
            NEW.id,
            COALESCE(NEW.cancelled_by, '00000000-0000-0000-0000-000000000000'::uuid), -- Placeholder UUID
            OLD.status,
            NEW.status,
            NEW.cancellation_reason,
            jsonb_build_object(
                'old_total_price', OLD.total_price,
                'new_total_price', NEW.total_price,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_status_change_trigger ON bookings;
CREATE TRIGGER booking_status_change_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_status_change();

-- =====================================================
-- STAFF SCHEDULE VIEW (ANONYMIZED CUSTOMER DATA)
-- =====================================================

-- View for staff to see their schedule without customer personal details
DROP VIEW IF EXISTS staff_schedule_view;
CREATE VIEW staff_schedule_view AS
SELECT 
    b.id as booking_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.special_requests,
    b.internal_notes,
    b.total_price,
    -- Enhanced anonymized customer info with consistent referencing
    CONCAT('Customer #', LPAD(ABS(HASHTEXT(b.customer_id::text)) % 10000, 4, '0')) as customer_reference,
    -- Service details
    s.name as service_name,
    s.category as service_category,
    s.duration_minutes,
    s.price as service_price,
    -- Room details
    r.name as room_name,
    r.number as room_number,
    r.bed_capacity,
    -- Staff info (for their own bookings)
    sp.employee_id as staff_employee_id,
    u.first_name as staff_first_name,
    u.last_name as staff_last_name,
    -- Additional useful fields
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN rooms r ON b.room_id = r.id
JOIN staff_profiles sp ON b.staff_id = sp.id
JOIN users u ON sp.user_id = u.id
WHERE b.status NOT IN ('cancelled');

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

-- Services policies (public read for active services)
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Rooms policies (public read for active rooms)
DROP POLICY IF EXISTS "Anyone can view active rooms" ON rooms;
CREATE POLICY "Anyone can view active rooms" ON rooms
    FOR SELECT USING (is_active = true);

-- Grant execute permissions for functions
GRANT EXECUTE ON FUNCTION check_room_availability TO public;
GRANT EXECUTE ON FUNCTION check_staff_availability TO public;
GRANT EXECUTE ON FUNCTION validate_service_room_compatibility TO public;
GRANT EXECUTE ON FUNCTION get_date_availability_summary TO public;
GRANT EXECUTE ON FUNCTION get_available_time_slots TO public;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database functions and optimizations completed!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created: Functions, triggers, indexes, views, and RLS policies';
    RAISE NOTICE 'Database is now ready for the booking system';
    RAISE NOTICE '==============================================';
END $$;