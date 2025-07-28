-- =====================================================
-- MedSpa Booking System Database Schema
-- =====================================================
-- This schema supports a complete spa booking system with:
-- - User management (customers, staff, admin)
-- - Service catalog with room restrictions
-- - Room management with capacity tracking
-- - Staff scheduling and availability
-- - Booking management with audit trails
-- - Comprehensive security via RLS policies
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- User roles for the system
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');

-- Booking status tracking
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Service categories
CREATE TYPE service_category AS ENUM ('massage', 'facial', 'body_treatment', 'nail_care', 'hair_removal', 'wellness');

-- Staff availability status
CREATE TYPE availability_status AS ENUM ('available', 'booked', 'break', 'unavailable');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (customers, staff, admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    date_of_birth DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    allergies TEXT,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Rooms table with capacity and equipment details
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    number INTEGER NOT NULL UNIQUE,
    bed_capacity INTEGER NOT NULL CHECK (bed_capacity > 0),
    has_shower BOOLEAN DEFAULT false,
    has_specialized_drainage BOOLEAN DEFAULT false,
    equipment JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service categories and restrictions
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category service_category NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    requires_specialized_drainage BOOLEAN DEFAULT false,
    min_room_capacity INTEGER DEFAULT 1 CHECK (min_room_capacity > 0),
    allowed_room_ids UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Staff profiles with specializations
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    hire_date DATE NOT NULL,
    specializations service_category[],
    certification_details JSONB DEFAULT '{}',
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT staff_profiles_user_role_check CHECK (
        (SELECT role FROM users WHERE id = user_id) IN ('staff', 'admin')
    )
);

-- Staff availability and schedule
CREATE TABLE staff_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status availability_status DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Main bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    special_requests TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT customer_role_check CHECK (
        (SELECT role FROM users WHERE id = customer_id) = 'customer'
    )
);

-- Booking audit trail
CREATE TABLE booking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    old_status booking_status,
    new_status booking_status,
    change_reason TEXT,
    change_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- Staff profile indexes
CREATE INDEX idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_employee_id ON staff_profiles(employee_id);
CREATE INDEX idx_staff_profiles_active ON staff_profiles(is_active) WHERE is_active = true;

-- Staff schedule indexes
CREATE INDEX idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
CREATE INDEX idx_staff_schedules_status ON staff_schedules(status);

-- Service indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX idx_services_deleted ON services(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_drainage ON services(requires_specialized_drainage) WHERE requires_specialized_drainage = true;

-- Room indexes
CREATE INDEX idx_rooms_number ON rooms(number);
CREATE INDEX idx_rooms_capacity ON rooms(bed_capacity);
CREATE INDEX idx_rooms_active ON rooms(is_active) WHERE is_active = true;
CREATE INDEX idx_rooms_drainage ON rooms(has_specialized_drainage) WHERE has_specialized_drainage = true;

-- Booking indexes (critical for performance)
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_active ON bookings(status) WHERE status NOT IN ('cancelled', 'completed');

-- Composite indexes for common queries
CREATE INDEX idx_bookings_room_date_time ON bookings(room_id, booking_date, start_time, end_time);
CREATE INDEX idx_bookings_staff_date_time ON bookings(staff_id, booking_date, start_time, end_time);

-- Booking history indexes
CREATE INDEX idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX idx_booking_history_changed_by ON booking_history(changed_by);
CREATE INDEX idx_booking_history_created_at ON booking_history(created_at);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON staff_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
    WHERE id = p_service_id;
    
    -- Get room capabilities
    SELECT bed_capacity, has_specialized_drainage
    INTO room_record
    FROM rooms
    WHERE id = p_room_id;
    
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
$$ LANGUAGE plpgsql;

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
            COALESCE(NEW.cancelled_by, (SELECT auth.uid())), -- Use cancelled_by or current user
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

CREATE TRIGGER booking_status_change_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_status_change();

-- =====================================================
-- STAFF SCHEDULE VIEW (ANONYMIZED CUSTOMER DATA)
-- =====================================================

-- View for staff to see their schedule without customer personal details
CREATE VIEW staff_schedule_view AS
SELECT 
    b.id as booking_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.special_requests,
    b.internal_notes,
    -- Anonymized customer info
    CONCAT('Customer #', SUBSTRING(b.customer_id::text, 1, 8)) as customer_reference,
    -- Service details
    s.name as service_name,
    s.category as service_category,
    s.duration_minutes,
    -- Room details
    r.name as room_name,
    r.number as room_number,
    -- Staff info (for their own bookings)
    sp.employee_id as staff_employee_id,
    u.first_name as staff_first_name,
    u.last_name as staff_last_name
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

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff can view customer profiles for their bookings" ON users
    FOR SELECT USING (
        role = 'customer' AND EXISTS (
            SELECT 1 FROM bookings b
            JOIN staff_profiles sp ON b.staff_id = sp.id
            WHERE b.customer_id = users.id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can view all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Staff profiles policies
CREATE POLICY "Staff can view their own profile" ON staff_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff can update their own profile" ON staff_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all staff profiles" ON staff_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Staff schedules policies
CREATE POLICY "Staff can view their own schedules" ON staff_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff_profiles sp
            WHERE sp.id = staff_schedules.staff_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can update their own schedules" ON staff_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM staff_profiles sp
            WHERE sp.id = staff_schedules.staff_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can manage all schedules" ON staff_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Services policies (public read, admin write)
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admin can manage services" ON services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Rooms policies (public read, admin write)
CREATE POLICY "Anyone can view active rooms" ON rooms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage rooms" ON rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Bookings policies
CREATE POLICY "Customers can view their own bookings" ON bookings
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create their own bookings" ON bookings
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own pending bookings" ON bookings
    FOR UPDATE USING (
        customer_id = auth.uid() 
        AND status = 'pending'
    );

CREATE POLICY "Staff can view their assigned bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff_profiles sp
            WHERE sp.id = bookings.staff_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can update their assigned bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM staff_profiles sp
            WHERE sp.id = bookings.staff_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can manage all bookings" ON bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Booking history policies
CREATE POLICY "Users can view history of their own bookings" ON booking_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_history.booking_id
            AND (
                b.customer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM staff_profiles sp
                    WHERE sp.id = b.staff_id AND sp.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Admin can view all booking history" ON booking_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample rooms
INSERT INTO rooms (name, number, bed_capacity, has_shower, has_specialized_drainage, equipment) VALUES
('Serenity Suite', 1, 1, true, false, '{"massage_table": true, "sound_system": true, "aromatherapy_diffuser": true}'),
('Harmony Haven', 2, 2, true, false, '{"massage_tables": 2, "sound_system": true, "couple_seating": true}'),
('Renewal Retreat', 3, 2, true, true, '{"massage_tables": 2, "body_scrub_station": true, "specialized_shower": true, "drainage_system": true}');

-- Insert sample services
INSERT INTO services (name, category, description, duration_minutes, price, requires_specialized_drainage, min_room_capacity, allowed_room_ids) VALUES
-- Massage services (any room)
('Swedish Massage', 'massage', 'Classic relaxation massage with flowing strokes', 60, 120.00, false, 1, NULL),
('Deep Tissue Massage', 'massage', 'Therapeutic massage targeting deep muscle tension', 90, 150.00, false, 1, NULL),
('Hot Stone Massage', 'massage', 'Warming massage using heated basalt stones', 90, 180.00, false, 1, NULL),
('Couples Massage', 'massage', 'Side-by-side massage experience for two', 60, 220.00, false, 2, (SELECT ARRAY[id] FROM rooms WHERE bed_capacity >= 2)),

-- Facial services (single person rooms preferred)
('Classic European Facial', 'facial', 'Deep cleansing and moisturizing facial treatment', 60, 95.00, false, 1, NULL),
('Anti-Aging Facial', 'facial', 'Advanced facial targeting fine lines and wrinkles', 75, 135.00, false, 1, NULL),
('Hydrating Facial', 'facial', 'Intensive moisture therapy for dry skin', 60, 110.00, false, 1, NULL),

-- Body treatments (Room 3 only for scrubs)
('Himalayan Salt Scrub', 'body_treatment', 'Full-body exfoliation with mineral-rich salt', 45, 95.00, true, 1, (SELECT ARRAY[id] FROM rooms WHERE number = 3)),
('Coffee Bean Body Scrub', 'body_treatment', 'Energizing scrub with organic coffee grounds', 45, 85.00, true, 1, (SELECT ARRAY[id] FROM rooms WHERE number = 3)),
('Body Wrap Treatment', 'body_treatment', 'Detoxifying body wrap with natural ingredients', 75, 125.00, false, 1, NULL),

-- Nail care services
('Classic Manicure', 'nail_care', 'Complete nail care with polish application', 45, 55.00, false, 1, NULL),
('Spa Pedicure', 'nail_care', 'Luxurious foot treatment with massage', 60, 75.00, false, 1, NULL),

-- Wellness services
('Aromatherapy Session', 'wellness', 'Relaxing session with essential oils', 30, 65.00, false, 1, NULL),
('Meditation Guidance', 'wellness', 'Guided meditation and breathing exercises', 45, 80.00, false, 1, NULL);

-- Insert sample admin user (password should be set via Supabase Auth)
INSERT INTO users (email, first_name, last_name, role, is_active) VALUES
('admin@medspa.com', 'Admin', 'User', 'admin', true);

-- =====================================================
-- HELPFUL QUERIES FOR DEVELOPMENT
-- =====================================================

-- Query to check room availability for a specific date and time
/*
SELECT r.name, r.number, r.bed_capacity,
       check_room_availability(r.id, '2024-01-15', '10:00', '11:30') as is_available
FROM rooms r
WHERE r.is_active = true;
*/

-- Query to view staff schedule with anonymized customer data
/*
SELECT * FROM staff_schedule_view
WHERE booking_date = CURRENT_DATE
ORDER BY start_time;
*/

-- Query to find available services for a specific room
/*
SELECT s.name, s.category, s.duration_minutes, s.price
FROM services s
WHERE s.is_active = true
  AND s.deleted_at IS NULL
  AND validate_service_room_compatibility(s.id, 'room-uuid-here') = true;
*/