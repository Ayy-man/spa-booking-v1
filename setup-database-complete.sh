#!/bin/bash

# Complete database setup script
# This script sets up the entire database with real services

echo "Starting complete database setup..."

# Database connection from .env.local
source .env.local
DATABASE_URL="${NEXT_PUBLIC_SUPABASE_URL/https:\/\//postgresql:\/\/postgres.}"
DATABASE_URL="${DATABASE_URL}.supabase.co:5432/postgres"

# Run scripts in order
echo "1. Running main schema setup..."
psql "$DATABASE_URL" < setup-database.sql

echo "2. Running database functions and optimizations..."
psql "$DATABASE_URL" < complete-database-functions.sql

echo "3. Inserting real spa services..."
psql "$DATABASE_URL" < insert-real-services.sql

echo "4. Adding sample rooms and staff..."
psql "$DATABASE_URL" << 'EOF'
-- Insert sample rooms
INSERT INTO rooms (name, number, bed_capacity, has_shower, has_specialized_drainage, equipment) VALUES
('Serenity Suite', 101, 1, true, false, '{"massage_table": true, "sound_system": true}'::jsonb),
('Harmony Room', 102, 1, true, false, '{"massage_table": true, "aromatherapy": true}'::jsonb),
('Tranquil Space', 103, 2, true, true, '{"massage_tables": 2, "specialized_equipment": true}'::jsonb),
('Wellness Chamber', 104, 1, true, true, '{"facial_bed": true, "steamer": true}'::jsonb),
('Spa Deluxe', 105, 2, true, true, '{"massage_tables": 2, "hydrotherapy": true}'::jsonb);

-- Insert sample staff
INSERT INTO users (email, first_name, last_name, phone, role, is_active) VALUES
('sarah.johnson@spa.com', 'Sarah', 'Johnson', '555-0101', 'staff', true),
('michael.chen@spa.com', 'Michael', 'Chen', '555-0102', 'staff', true),
('emma.williams@spa.com', 'Emma', 'Williams', '555-0103', 'staff', true),
('david.garcia@spa.com', 'David', 'Garcia', '555-0104', 'staff', true),
('lisa.anderson@spa.com', 'Lisa', 'Anderson', '555-0105', 'staff', true);

-- Create staff profiles
INSERT INTO staff_profiles (user_id, employee_id, hire_date, specializations) 
SELECT 
    id, 
    'EMP' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 3, '0'),
    CURRENT_DATE - INTERVAL '1 year',
    ARRAY['massage', 'facial', 'body_treatment']::text[]
FROM users 
WHERE role = 'staff' AND email LIKE '%@spa.com';

-- Create staff schedules for the next 30 days
INSERT INTO staff_schedules (staff_id, date, start_time, end_time, status)
SELECT 
    sp.id,
    date_series.date,
    '09:00'::time,
    '18:00'::time,
    'available'
FROM staff_profiles sp
CROSS JOIN generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    INTERVAL '1 day'
) AS date_series(date)
WHERE EXTRACT(DOW FROM date_series.date) NOT IN (0, 6); -- Exclude weekends
EOF

echo "Database setup complete!"
echo "Your spa booking system database is now ready with:"
echo "- 44 real spa services"
echo "- 5 treatment rooms" 
echo "- 5 staff members with schedules"
echo "- All required functions and indexes"