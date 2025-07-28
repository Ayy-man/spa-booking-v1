-- Fix the problematic database functions

-- 1. Fix get_date_availability_summary function with correct return type
DROP FUNCTION IF EXISTS get_date_availability_summary CASCADE;
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
            p_start_date::timestamp, 
            (p_start_date + INTERVAL '1 day' * (p_days - 1))::timestamp, 
            '1 day'::interval
        )::date AS date_val
    ),
    staff_capacity AS (
        SELECT 
            ss.date,
            COUNT(*) * 20 as total_possible_slots
        FROM staff_schedules ss
        WHERE ss.date >= p_start_date 
        AND ss.date <= p_start_date + INTERVAL '1 day' * (p_days - 1)
        AND ss.status = 'available'
        GROUP BY ss.date
    ),
    bookings_count AS (
        SELECT 
            b.booking_date,
            COUNT(*)::INTEGER as booked_count
        FROM bookings b
        WHERE b.booking_date >= p_start_date 
        AND b.booking_date <= p_start_date + INTERVAL '1 day' * (p_days - 1)
        AND b.status NOT IN ('cancelled', 'no_show')
        GROUP BY b.booking_date
    )
    SELECT 
        ds.date_val,
        COALESCE(sc.total_possible_slots, 0)::INTEGER as total_slots,
        COALESCE(bc.booked_count, 0)::INTEGER as booked_slots,
        GREATEST(0, COALESCE(sc.total_possible_slots, 0) - COALESCE(bc.booked_count, 0))::INTEGER as available_slots,
        (GREATEST(0, COALESCE(sc.total_possible_slots, 0) - COALESCE(bc.booked_count, 0)) > 0)::BOOLEAN as has_availability
    FROM date_series ds
    LEFT JOIN staff_capacity sc ON ds.date_val = sc.date
    LEFT JOIN bookings_count bc ON ds.date_val = bc.booking_date
    ORDER BY ds.date_val;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Fix get_available_time_slots function with simpler time generation
DROP FUNCTION IF EXISTS get_available_time_slots CASCADE;
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
    service_duration INTEGER := 60;
    time_slot_record RECORD;
BEGIN
    -- Get service duration if provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration_minutes INTO service_duration
        FROM services 
        WHERE id = p_service_id;
        
        IF service_duration IS NULL THEN
            service_duration := 60;
        END IF;
    END IF;

    -- Generate time slots manually and return results
    FOR time_slot_record IN 
        SELECT t::time as slot_time 
        FROM (
            SELECT '09:00'::time + (n || ' minutes')::interval as t
            FROM generate_series(0, 600, 30) as n  -- 9 AM to 7 PM in 30-min intervals
        ) slots
        WHERE t <= '19:00'::time
    LOOP
        DECLARE
            staff_count INTEGER := 0;
            room_count INTEGER := 0;
            first_staff_id UUID;
            first_room_id UUID;
        BEGIN
            -- Count available staff for this time slot
            SELECT COUNT(*), MIN(sp.id)
            INTO staff_count, first_staff_id
            FROM staff_profiles sp
            JOIN staff_schedules ss ON sp.id = ss.staff_id
            WHERE ss.date = p_date
            AND ss.status = 'available'
            AND ss.start_time <= time_slot_record.slot_time
            AND ss.end_time >= (time_slot_record.slot_time + (service_duration || ' minutes')::interval)::time
            AND sp.is_active = true
            AND (p_staff_id IS NULL OR sp.id = p_staff_id)
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.staff_id = sp.id
                AND b.booking_date = p_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND b.start_time < (time_slot_record.slot_time + (service_duration || ' minutes')::interval)::time
                AND b.end_time > time_slot_record.slot_time
            );

            -- Count available rooms for this time slot
            SELECT COUNT(*), MIN(r.id)
            INTO room_count, first_room_id
            FROM rooms r
            WHERE r.is_active = true
            AND (p_room_id IS NULL OR r.id = p_room_id)
            AND (p_service_id IS NULL OR validate_service_room_compatibility(p_service_id, r.id))
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = r.id
                AND b.booking_date = p_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND b.start_time < (time_slot_record.slot_time + (service_duration || ' minutes')::interval)::time
                AND b.end_time > time_slot_record.slot_time
            );

            -- Return the result for this time slot
            time_slot := time_slot_record.slot_time;
            available_staff_count := COALESCE(staff_count, 0);
            available_room_count := COALESCE(room_count, 0);
            is_available := (COALESCE(staff_count, 0) > 0 AND COALESCE(room_count, 0) > 0);
            suggested_staff_id := first_staff_id;
            suggested_room_id := first_room_id;
            
            RETURN NEXT;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_date_availability_summary TO public;
GRANT EXECUTE ON FUNCTION get_available_time_slots TO public;

-- 4. Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database functions FIXED successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Fixed:';
    RAISE NOTICE '- get_date_availability_summary (return type corrected)';
    RAISE NOTICE '- get_available_time_slots (time generation fixed)';
    RAISE NOTICE '==============================================';
END $$;