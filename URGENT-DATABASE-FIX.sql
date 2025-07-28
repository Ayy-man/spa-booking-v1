-- URGENT: Run this in Supabase SQL Editor to fix critical infrastructure

-- 1. Create missing staff_schedules table
CREATE TABLE public.staff_schedules (
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

-- 2. Create indexes for performance
CREATE INDEX idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
CREATE INDEX idx_staff_schedules_status ON staff_schedules(status);

-- 3. Create booking_history table for audit trails
CREATE TABLE public.booking_history (
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

-- 4. Create essential database functions
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

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION check_room_availability TO public;
GRANT EXECUTE ON FUNCTION check_staff_availability TO public;

-- 6. Create staff schedule view for staff dashboard
CREATE VIEW staff_schedule_view AS
SELECT 
    b.id as booking_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.special_requests,
    b.total_price,
    -- Anonymized customer info
    CONCAT('Customer #', LPAD(ABS(EXTRACT(EPOCH FROM b.created_at)::int) % 10000, 4, '0')) as customer_reference,
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

-- 7. Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Critical database infrastructure created!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created: staff_schedules, booking_history, functions, view';
    RAISE NOTICE 'Next: Run populate script to add schedule data';
    RAISE NOTICE '==============================================';
END $$;