-- FINAL FIXED: Database setup with proper type casting

-- 1. Drop existing functions that might have different signatures
DROP FUNCTION IF EXISTS check_room_availability CASCADE;
DROP FUNCTION IF EXISTS check_staff_availability CASCADE;
DROP FUNCTION IF EXISTS validate_service_room_compatibility CASCADE;
DROP FUNCTION IF EXISTS get_date_availability_summary CASCADE;
DROP FUNCTION IF EXISTS get_available_time_slots CASCADE;

-- 2. Create missing staff_schedules table
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  status character varying DEFAULT 'available'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  CONSTRAINT staff_schedules_status_check CHECK (status IN ('available', 'booked', 'break', 'unavailable'))
);

-- 3. Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_status ON staff_schedules(status);

-- 4. Create booking_history table for audit trails
CREATE TABLE IF NOT EXISTS public.booking_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  changed_by uuid,
  old_status character varying,
  new_status character varying,
  change_reason text,
  change_details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_history_pkey PRIMARY KEY (id),
  CONSTRAINT booking_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);

-- 5. Create the correct database functions with proper signatures
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

-- 6. Create additional useful functions
CREATE OR REPLACE FUNCTION validate_service_room_compatibility(
    p_service_id UUID,
    p_room_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    service_drainage BOOLEAN;
    service_capacity INTEGER;
    room_drainage BOOLEAN;
    room_capacity INTEGER;
BEGIN
    -- Get service requirements
    SELECT requires_specialized_drainage, min_room_capacity
    INTO service_drainage, service_capacity
    FROM services
    WHERE id = p_service_id AND is_active = true;
    
    -- Return false if service not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get room capabilities
    SELECT has_specialized_drainage, bed_capacity
    INTO room_drainage, room_capacity
    FROM rooms
    WHERE id = p_room_id AND is_active = true;
    
    -- Return false if room not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check capacity requirement
    IF room_capacity < service_capacity THEN
        RETURN FALSE;
    END IF;
    
    -- Check drainage requirement
    IF service_drainage AND NOT room_drainage THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

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
            COUNT(*) * 20 as total_possible_slots -- 20 slots per staff per day
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
    service_duration INTEGER := 60; -- Default 60 minutes
BEGIN
    -- Get service duration if provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration_minutes INTO service_duration
        FROM services 
        WHERE id = p_service_id;
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
            sp.id as staff_id
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

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION check_room_availability TO public;
GRANT EXECUTE ON FUNCTION check_staff_availability TO public;
GRANT EXECUTE ON FUNCTION validate_service_room_compatibility TO public;
GRANT EXECUTE ON FUNCTION get_date_availability_summary TO public;
GRANT EXECUTE ON FUNCTION get_available_time_slots TO public;

-- 8. Drop existing view and recreate with FIXED LPAD casting
DROP VIEW IF EXISTS staff_schedule_view;
CREATE VIEW staff_schedule_view AS
SELECT 
    b.id as booking_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.special_requests,
    b.total_price,
    -- FIXED: Anonymized customer info with proper type casting
    CONCAT('Customer #', LPAD((ABS(EXTRACT(EPOCH FROM b.created_at)::int) % 10000)::text, 4, '0')) as customer_reference,
    -- Service details
    s.name as service_name,
    s.category as service_category,
    s.duration_minutes,
    s.price as service_price,
    -- Room details
    r.name as room_name,
    r.number as room_number,
    -- Staff info
    sp.employee_id as staff_employee_id,
    u.first_name as staff_first_name,
    u.last_name as staff_last_name,
    -- Timestamps
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN rooms r ON b.room_id = r.id
JOIN staff_profiles sp ON b.staff_id = sp.id
JOIN users u ON sp.user_id = u.id
WHERE b.status NOT IN ('cancelled');

-- 9. Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'FINAL FIXED: Database infrastructure created successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created/Fixed:';
    RAISE NOTICE '- staff_schedules table';
    RAISE NOTICE '- booking_history table';
    RAISE NOTICE '- check_room_availability function';
    RAISE NOTICE '- check_staff_availability function';
    RAISE NOTICE '- validate_service_room_compatibility function';
    RAISE NOTICE '- get_date_availability_summary function';
    RAISE NOTICE '- get_available_time_slots function';
    RAISE NOTICE '- staff_schedule_view (with fixed LPAD casting)';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Next: Run populate-staff-schedules.js';
    RAISE NOTICE '==============================================';
END $$;