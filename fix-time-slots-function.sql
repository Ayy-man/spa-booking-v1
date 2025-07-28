-- Fix the get_available_time_slots function - UUID aggregation issue
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
            -- Count available staff and get first available staff ID
            WITH available_staff AS (
                SELECT sp.id
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
                )
                ORDER BY sp.id
                LIMIT 10
            )
            SELECT COUNT(*)::INTEGER, 
                   (SELECT id FROM available_staff LIMIT 1)
            INTO staff_count, first_staff_id
            FROM available_staff;

            -- Count available rooms and get first available room ID
            WITH available_rooms AS (
                SELECT r.id
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
                )
                ORDER BY r.id
                LIMIT 10
            )
            SELECT COUNT(*)::INTEGER,
                   (SELECT id FROM available_rooms LIMIT 1)
            INTO room_count, first_room_id
            FROM available_rooms;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_time_slots TO public;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Time slots function FIXED successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Fixed: get_available_time_slots (UUID aggregation issue resolved)';
    RAISE NOTICE '==============================================';
END $$;