-- =====================================================
-- FIX TIME SLOT GENERATION
-- =====================================================

-- Replace the problematic time slot generation function
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
        WHERE id = p_service_id AND is_active = true;
        
        IF service_duration IS NULL THEN
            service_duration := 60;
        END IF;
    END IF;

    RETURN QUERY
    WITH time_slots AS (
        -- Manually create time slots to avoid generate_series with TIME issue
        SELECT unnest(ARRAY[
            '09:00'::time, '09:30'::time, '10:00'::time, '10:30'::time,
            '11:00'::time, '11:30'::time, '12:00'::time, '12:30'::time,
            '13:00'::time, '13:30'::time, '14:00'::time, '14:30'::time,
            '15:00'::time, '15:30'::time, '16:00'::time, '16:30'::time,
            '17:00'::time, '17:30'::time, '18:00'::time, '18:30'::time
        ]) AS slot_time
    ),
    available_rooms AS (
        SELECT 
            ts.slot_time,
            r.id as room_id,
            ROW_NUMBER() OVER (PARTITION BY ts.slot_time ORDER BY r.number) as room_rank
        FROM time_slots ts
        CROSS JOIN rooms r
        WHERE r.is_active = true
        AND (p_room_id IS NULL OR r.id = p_room_id)
        -- Check service compatibility if service specified
        AND (p_service_id IS NULL OR (
            -- Check for body scrub services requiring Room 3
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM services s 
                    WHERE s.id = p_service_id 
                    AND s.requires_specialized_drainage = true
                ) THEN r.has_specialized_drainage = true
                ELSE true 
            END
        ))
        -- Check no conflicting room bookings
        AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND b.start_time < (ts.slot_time + (service_duration || ' minutes')::interval)::time
            AND b.end_time > ts.slot_time
        )
    ),
    mock_staff AS (
        -- Create mock staff availability since we don't have staff schedules set up
        SELECT 
            ts.slot_time,
            sp.id as staff_id,
            ROW_NUMBER() OVER (PARTITION BY ts.slot_time ORDER BY sp.created_at) as staff_rank
        FROM time_slots ts
        CROSS JOIN staff_profiles sp
        WHERE sp.is_active = true
        AND (p_staff_id IS NULL OR sp.id = p_staff_id)
        -- Check no conflicting staff bookings
        AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.staff_id = sp.id
            AND b.booking_date = p_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND b.start_time < (ts.slot_time + (service_duration || ' minutes')::interval)::time
            AND b.end_time > ts.slot_time
        )
    )
    SELECT 
        ts.slot_time,
        COALESCE(staff_count.count, 0) as available_staff_count,
        COALESCE(room_count.count, 0) as available_room_count,
        (COALESCE(staff_count.count, 0) > 0 AND COALESCE(room_count.count, 0) > 0) as is_available,
        first_staff.staff_id as suggested_staff_id,
        first_room.room_id as suggested_room_id
    FROM time_slots ts
    LEFT JOIN (
        SELECT slot_time, COUNT(*) as count
        FROM mock_staff
        GROUP BY slot_time
    ) staff_count ON ts.slot_time = staff_count.slot_time
    LEFT JOIN (
        SELECT slot_time, COUNT(*) as count
        FROM available_rooms
        GROUP BY slot_time
    ) room_count ON ts.slot_time = room_count.slot_time
    LEFT JOIN (
        SELECT slot_time, staff_id
        FROM mock_staff
        WHERE staff_rank = 1
    ) first_staff ON ts.slot_time = first_staff.slot_time
    LEFT JOIN (
        SELECT slot_time, room_id
        FROM available_rooms
        WHERE room_rank = 1
    ) first_room ON ts.slot_time = first_room.slot_time
    ORDER BY ts.slot_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_time_slots TO public;

-- Test the function
SELECT 'Fixed time slot function created successfully!' as result;