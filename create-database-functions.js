const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  const envVars = {}
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
  }
  
  return envVars
}

const env = loadEnv()

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function createDatabaseFunctions() {
  try {
    console.log('🔧 Creating database functions...')
    
    // Read the SQL functions file
    const functionsSQL = fs.readFileSync(path.join(__dirname, 'complete-database-functions.sql'), 'utf8')
    
    // Execute the SQL to create functions
    const { data, error } = await supabase.rpc('exec_sql', { sql: functionsSQL })
    
    if (error) {
      console.error('Error creating database functions:', error)
      return false
    }
    
    console.log('✅ Database functions created successfully')
    
    // Test the functions
    console.log('🧪 Testing functions...')
    
    // Test get_date_availability_summary
    const { data: availabilityData, error: availabilityError } = await supabase.rpc('get_date_availability_summary', {
      p_start_date: new Date().toISOString().split('T')[0],
      p_days: 7
    })
    
    if (availabilityError) {
      console.error('Availability function test failed:', availabilityError)
    } else {
      console.log('✅ Availability function working:', availabilityData?.length || 0, 'days returned')
    }
    
    // Test get_available_time_slots
    const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_time_slots', {
      p_date: new Date().toISOString().split('T')[0]
    })
    
    if (slotsError) {
      console.error('Time slots function test failed:', slotsError)
    } else {
      console.log('✅ Time slots function working:', slotsData?.length || 0, 'slots returned')
    }
    
    return true
    
  } catch (error) {
    console.error('Function creation failed:', error)
    return false
  }
}

// Alternative approach: Execute SQL directly
async function createFunctionsDirectly() {
  try {
    console.log('🔧 Creating database functions directly...')
    
    // Key functions needed for the booking system
    const functions = [
      // Check room availability function
      `
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
      `,
      
      // Check staff availability function
      `
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
      `,
      
      // Get date availability summary
      `
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
                  COUNT(*) * 12 as total_possible_slots
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
      `,
      
      // Get available time slots
      `
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
      BEGIN
          -- Get service duration if provided
          IF p_service_id IS NOT NULL THEN
              SELECT duration_minutes INTO service_duration
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
      `
    ]
    
    for (const [index, func] of functions.entries()) {
      console.log(`Creating function ${index + 1}/${functions.length}...`)
      const { error } = await supabase.rpc('sql', { query: func })
      
      if (error) {
        console.error(`Error creating function ${index + 1}:`, error)
        return false
      }
    }
    
    console.log('✅ All database functions created successfully')
    return true
    
  } catch (error) {
    console.error('Direct function creation failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Setting up database functions...')
  
  // Try the direct approach first
  const success = await createFunctionsDirectly()
  
  if (success) {
    console.log('🎉 Database functions setup complete!')
    console.log('The booking system now has:')
    console.log('- Room availability checking')
    console.log('- Staff availability checking') 
    console.log('- Date availability summary')
    console.log('- Time slot availability queries')
  } else {
    console.log('❌ Database functions setup failed')
  }
}

main()