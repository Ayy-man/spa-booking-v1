-- =====================================================
-- Date-Based Query Optimization Migration
-- =====================================================
-- Optimizes database for DatePicker (14-day view) and TimeSlotPicker components
-- Adds specialized indexes for fast availability checking and staff scheduling
-- =====================================================

-- =====================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =====================================================

-- Enhanced date range queries for DatePicker (next 14 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date_range_active 
ON bookings(booking_date, status) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Optimized composite index for availability queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_availability_lookup 
ON bookings(booking_date, start_time, end_time, room_id, staff_id, status) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Staff schedule optimization for daily/weekly views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_date_range 
ON staff_schedules(date, staff_id, status) 
WHERE status = 'available';

-- Time-based partial index for same-day bookings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_today 
ON bookings(start_time, end_time, room_id, staff_id) 
WHERE booking_date = CURRENT_DATE AND status NOT IN ('cancelled', 'no_show');

-- Room availability optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_room_time_conflict 
ON bookings(room_id, booking_date, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Staff availability optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_staff_time_conflict 
ON bookings(staff_id, booking_date, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- Service compatibility lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_room_compatibility 
ON services(requires_specialized_drainage, min_room_capacity, allowed_room_ids) 
WHERE is_active = true AND deleted_at IS NULL;

-- =====================================================
-- OPTIMIZED AVAILABILITY FUNCTIONS
-- =====================================================

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

-- Optimized room availability check with caching hints
CREATE OR REPLACE FUNCTION check_room_availability_optimized(
    p_room_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Use the specialized index for conflict detection
    RETURN NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
        AND booking_date = p_booking_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND start_time < p_end_time 
        AND end_time > p_start_time
        LIMIT 1 -- Early termination for better performance
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized staff availability check
CREATE OR REPLACE FUNCTION check_staff_availability_optimized(
    p_staff_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- First check for booking conflicts (faster due to specialized index)
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
        AND booking_date = p_booking_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND start_time < p_end_time 
        AND end_time > p_start_time
        LIMIT 1
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Then check if staff is scheduled (using optimized index)
    RETURN EXISTS (
        SELECT 1 FROM staff_schedules
        WHERE staff_id = p_staff_id
        AND date = p_booking_date
        AND status = 'available'
        AND start_time <= p_start_time
        AND end_time >= p_end_time
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ENHANCED STAFF SCHEDULE VIEW
-- =====================================================

-- Drop and recreate the staff schedule view with performance optimizations
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

-- Create index on the view's underlying queries for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedule_view_lookup
ON bookings(staff_id, booking_date, status)
WHERE status NOT IN ('cancelled');

-- =====================================================
-- UTILITY FUNCTIONS FOR API ENDPOINTS
-- =====================================================

-- Get booking conflicts for a specific time range (useful for validation)
CREATE OR REPLACE FUNCTION get_booking_conflicts(
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_room_id UUID DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    conflict_type TEXT,
    resource_name TEXT,
    existing_start_time TIME,
    existing_end_time TIME,
    customer_reference TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as booking_id,
        CASE 
            WHEN b.room_id = p_room_id THEN 'room_conflict'
            WHEN b.staff_id = p_staff_id THEN 'staff_conflict'
            ELSE 'general_conflict'
        END as conflict_type,
        CASE 
            WHEN b.room_id = p_room_id THEN r.name
            WHEN b.staff_id = p_staff_id THEN u.first_name || ' ' || u.last_name
            ELSE 'Unknown'
        END as resource_name,
        b.start_time as existing_start_time,
        b.end_time as existing_end_time,
        CONCAT('Customer #', LPAD(ABS(HASHTEXT(b.customer_id::text)) % 10000, 4, '0')) as customer_reference
    FROM bookings b
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN staff_profiles sp ON b.staff_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE b.booking_date = p_date
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_time < p_end_time
    AND b.end_time > p_start_time
    AND (p_room_id IS NULL OR b.room_id = p_room_id OR p_staff_id IS NULL OR b.staff_id = p_staff_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION analyze_booking_performance()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'active_bookings_count'::TEXT, COUNT(*)::NUMERIC, 'Total active bookings'::TEXT
    FROM bookings WHERE status NOT IN ('cancelled', 'completed')
    
    UNION ALL
    
    SELECT 'avg_bookings_per_day'::TEXT, 
           COALESCE(AVG(daily_count), 0)::NUMERIC, 
           'Average bookings per day (last 30 days)'::TEXT
    FROM (
        SELECT COUNT(*) as daily_count
        FROM bookings 
        WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
        AND status NOT IN ('cancelled', 'no_show')
        GROUP BY booking_date
    ) daily_stats
    
    UNION ALL
    
    SELECT 'peak_utilization_percentage'::TEXT,
           CASE WHEN total_slots.count > 0 THEN 
               (booked_slots.count::NUMERIC / total_slots.count::NUMERIC * 100)
           ELSE 0 END,
           'Peak day utilization in last 7 days'::TEXT
    FROM (
        SELECT COUNT(*) as count FROM bookings 
        WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days'
        AND status NOT IN ('cancelled', 'no_show')
    ) booked_slots,
    (
        SELECT COUNT(*) * 12 as count FROM staff_schedules
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        AND status = 'available'
    ) total_slots;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_date_availability_summary IS 'Provides availability summary for DatePicker component - optimized for 14-day view';
COMMENT ON FUNCTION get_available_time_slots IS 'Returns detailed time slot availability for TimeSlotPicker component';
COMMENT ON FUNCTION check_room_availability_optimized IS 'High-performance room availability check using specialized indexes';
COMMENT ON FUNCTION check_staff_availability_optimized IS 'High-performance staff availability check using specialized indexes';
COMMENT ON VIEW staff_schedule_view IS 'Anonymized staff schedule view with enhanced customer reference system';
COMMENT ON FUNCTION get_booking_conflicts IS 'Utility function for debugging and validation of booking conflicts';
COMMENT ON FUNCTION analyze_booking_performance IS 'Performance monitoring and analytics function';

-- =====================================================
-- PERFORMANCE ANALYSIS
-- =====================================================

-- Create a function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    AND (tablename LIKE '%booking%' OR tablename LIKE '%staff%' OR tablename LIKE '%room%')
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_index_usage IS 'Analyzes index usage statistics for booking-related tables';