-- =====================================================
-- MedSpa Database Setup Script
-- =====================================================
-- Execute this ENTIRE script in your Supabase SQL Editor
-- This will create all tables, functions, and sample data
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- User roles for the system
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking status tracking
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Service categories
DO $$ BEGIN
    CREATE TYPE service_category AS ENUM ('massage', 'facial', 'body_treatment', 'nail_care', 'hair_removal', 'wellness');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Staff availability status
DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM ('available', 'booked', 'break', 'unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (customers, staff, admin)
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS rooms (
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
CREATE TABLE IF NOT EXISTS services (
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
CREATE TABLE IF NOT EXISTS staff_profiles (
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
CREATE TABLE IF NOT EXISTS staff_schedules (
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
CREATE TABLE IF NOT EXISTS bookings (
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
CREATE TABLE IF NOT EXISTS booking_history (
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
-- SAMPLE DATA (Insert rooms and services)
-- =====================================================

-- Insert sample rooms
INSERT INTO rooms (name, number, bed_capacity, has_shower, has_specialized_drainage, equipment) VALUES
('Serenity Suite', 1, 1, true, false, '{"massage_table": true, "sound_system": true, "aromatherapy_diffuser": true}'),
('Harmony Haven', 2, 2, true, false, '{"massage_tables": 2, "sound_system": true, "couple_seating": true}'),
('Renewal Retreat', 3, 2, true, true, '{"massage_tables": 2, "body_scrub_station": true, "specialized_shower": true, "drainage_system": true}')
ON CONFLICT (number) DO NOTHING;

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
('Meditation Guidance', 'wellness', 'Guided meditation and breathing exercises', 45, 80.00, false, 1, NULL)
ON CONFLICT DO NOTHING;

-- Insert sample admin user (password should be set via Supabase Auth)
INSERT INTO users (email, first_name, last_name, role, is_active) VALUES
('admin@medspa.com', 'Admin', 'User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: users, rooms, services, staff_profiles, staff_schedules, bookings, booking_history';
    RAISE NOTICE 'Sample data inserted: 3 rooms, 14 services, 1 admin user';
    RAISE NOTICE 'Next step: Run the functions and indexes from the migration files';
    RAISE NOTICE '==============================================';
END $$;