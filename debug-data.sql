-- Check what data exists in the database
SELECT 'ROOMS' as table_name, COUNT(*) as count FROM rooms
UNION ALL
SELECT 'SERVICES', COUNT(*) FROM services  
UNION ALL
SELECT 'USERS', COUNT(*) FROM users
UNION ALL
SELECT 'STAFF_PROFILES', COUNT(*) FROM staff_profiles
UNION ALL
SELECT 'BOOKINGS', COUNT(*) FROM bookings;