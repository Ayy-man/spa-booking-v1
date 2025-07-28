const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

function loadEnv() {
  const envPath = '.env.local'
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function verifyDatabaseSetup() {
  console.log('🔍 VERIFYING DATABASE SETUP')
  console.log('=' .repeat(50))
  
  let allPassed = true
  
  // Test 1: Check all required tables exist
  console.log('\n1️⃣  CHECKING TABLES...')
  const tables = ['users', 'services', 'rooms', 'staff_profiles', 'bookings', 'staff_schedules', 'booking_history']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
        allPassed = false
      } else {
        const hasData = data && data.length > 0
        console.log(`✅ ${table}: EXISTS ${hasData ? '(has data)' : '(empty)'}`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
      allPassed = false
    }
  }
  
  // Test 2: Check database functions exist
  console.log('\n2️⃣  CHECKING DATABASE FUNCTIONS...')
  const functions = [
    'check_room_availability',
    'check_staff_availability', 
    'validate_service_room_compatibility',
    'get_date_availability_summary',
    'get_available_time_slots'
  ]
  
  for (const func of functions) {
    try {
      // Test each function with minimal parameters
      let result
      switch (func) {
        case 'check_room_availability':
          result = await supabase.rpc(func, {
            p_room_id: '00000000-0000-0000-0000-000000000000',
            p_booking_date: '2025-07-28',
            p_start_time: '09:00',
            p_end_time: '10:00'
          })
          break
        case 'check_staff_availability':
          result = await supabase.rpc(func, {
            p_staff_id: '00000000-0000-0000-0000-000000000000',
            p_booking_date: '2025-07-28',
            p_start_time: '09:00',
            p_end_time: '10:00'
          })
          break
        case 'validate_service_room_compatibility':
          result = await supabase.rpc(func, {
            p_service_id: '00000000-0000-0000-0000-000000000000',
            p_room_id: '00000000-0000-0000-0000-000000000000'
          })
          break
        case 'get_date_availability_summary':
          result = await supabase.rpc(func, {
            p_start_date: '2025-07-28',
            p_days: 7
          })
          break
        case 'get_available_time_slots':
          result = await supabase.rpc(func, {
            p_date: '2025-07-28'
          })
          break
      }
      
      if (result.error) {
        console.log(`❌ ${func}: ${result.error.message}`)
        allPassed = false
      } else {
        console.log(`✅ ${func}: WORKING`)
      }
    } catch (err) {
      console.log(`❌ ${func}: ${err.message}`)
      allPassed = false
    }
  }
  
  // Test 3: Check staff_schedules has data
  console.log('\n3️⃣  CHECKING STAFF SCHEDULES DATA...')
  try {
    const { data: schedules, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .limit(5)
    
    if (error) {
      console.log(`❌ Staff schedules query failed: ${error.message}`)
      allPassed = false
    } else if (!schedules || schedules.length === 0) {
      console.log('⚠️  Staff schedules table is empty - need to populate!')
      console.log('   Run: node populate-staff-schedules.js')
      allPassed = false
    } else {
      console.log(`✅ Staff schedules: ${schedules.length} entries found`)
      console.log(`   Sample: ${schedules[0].date} - ${schedules[0].start_time} to ${schedules[0].end_time}`)
    }
  } catch (err) {
    console.log(`❌ Staff schedules check failed: ${err.message}`)
    allPassed = false
  }
  
  // Test 4: Check services data
  console.log('\n4️⃣  CHECKING SERVICES DATA...')
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('name, category, duration_minutes, price')
      .eq('is_active', true)
      .limit(5)
    
    if (error) {
      console.log(`❌ Services query failed: ${error.message}`)
      allPassed = false
    } else if (!services || services.length === 0) {
      console.log('❌ No active services found!')
      allPassed = false
    } else {
      console.log(`✅ Services: ${services.length} found`)
      services.forEach(service => {
        console.log(`   - ${service.name} (${service.duration_minutes}min, $${service.price})`)
      })
    }
  } catch (err) {
    console.log(`❌ Services check failed: ${err.message}`)
    allPassed = false
  }
  
  // Test 5: Check Hot Stone services specifically
  console.log('\n5️⃣  CHECKING HOT STONE SERVICES...')
  try {
    const { data: hotStoneServices, error } = await supabase
      .from('services')
      .select('name, duration_minutes, price')
      .ilike('name', '%hot stone%')
      .eq('is_active', true)
    
    if (error) {
      console.log(`❌ Hot Stone services query failed: ${error.message}`)
      allPassed = false
    } else if (!hotStoneServices || hotStoneServices.length === 0) {
      console.log('❌ No Hot Stone services found!')
      allPassed = false
    } else {
      console.log(`✅ Hot Stone services: ${hotStoneServices.length} found`)
      hotStoneServices.forEach(service => {
        console.log(`   - ${service.name} (${service.duration_minutes}min, $${service.price})`)
      })
    }
  } catch (err) {
    console.log(`❌ Hot Stone services check failed: ${err.message}`)
    allPassed = false
  }
  
  // Test 6: Check staff and rooms
  console.log('\n6️⃣  CHECKING STAFF AND ROOMS...')
  try {
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('employee_id, is_active')
      .eq('is_active', true)
    
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('name, number, is_active')
      .eq('is_active', true)
    
    if (staffError) {
      console.log(`❌ Staff query failed: ${staffError.message}`)
      allPassed = false
    } else {
      console.log(`✅ Active staff: ${staff?.length || 0}`)
    }
    
    if (roomsError) {
      console.log(`❌ Rooms query failed: ${roomsError.message}`)
      allPassed = false
    } else {
      console.log(`✅ Active rooms: ${rooms?.length || 0}`)
    }
  } catch (err) {
    console.log(`❌ Staff/Rooms check failed: ${err.message}`)
    allPassed = false
  }
  
  // Test 7: Test view
  console.log('\n7️⃣  CHECKING STAFF SCHEDULE VIEW...')
  try {
    const { data: viewData, error } = await supabase
      .from('staff_schedule_view')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ Staff schedule view failed: ${error.message}`)
      allPassed = false
    } else {
      console.log(`✅ Staff schedule view: WORKING`)
    }
  } catch (err) {
    console.log(`❌ Staff schedule view check failed: ${err.message}`)
    allPassed = false
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('🎉 ALL VERIFICATIONS PASSED!')
    console.log('✅ Database infrastructure is complete and working')
    console.log('✅ Ready to test API endpoints and booking flow')
  } else {
    console.log('⚠️  SOME VERIFICATIONS FAILED')
    console.log('❌ Database setup needs attention before proceeding')
  }
  console.log('='.repeat(50))
  
  return allPassed
}

verifyDatabaseSetup()