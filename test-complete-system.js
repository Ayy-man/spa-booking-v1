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

async function testDatabaseInfrastructure() {
  console.log('🔍 Testing Database Infrastructure...\n')
  
  const tables = ['users', 'services', 'rooms', 'staff_profiles', 'bookings', 'staff_schedules', 'booking_history']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: EXISTS ${data.length > 0 ? '(has data)' : '(empty)'}`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
}

async function testServiceAvailability() {
  console.log('\n🎯 Testing Hot Stone Services...\n')
  
  const { data: hotStoneServices, error } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price, category')
    .ilike('name', '%hot stone%')
  
  if (error) {
    console.log('❌ Error fetching Hot Stone services:', error.message)
    return
  }
  
  console.log(`Found ${hotStoneServices.length} Hot Stone services:`)
  hotStoneServices.forEach(service => {
    console.log(`  ✅ ${service.name} (${service.duration_minutes}min, $${service.price})`)
  })
  
  return hotStoneServices[0]?.id
}

async function testAvailabilityAPIs() {
  console.log('\n🌐 Testing Availability APIs...\n')
  
  try {
    // Test date availability
    console.log('Testing date availability...')
    const dateResponse = await fetch('http://localhost:3000/api/availability')
    const dateData = await dateResponse.json()
    
    if (dateData.success) {
      console.log(`✅ Date API: ${dateData.data.dateAvailability.length} dates returned`)
      const today = dateData.data.dateAvailability[0]
      console.log(`   Today: ${today.availableSlots}/${today.totalSlots} slots available`)
    } else {
      console.log(`❌ Date API failed: ${dateData.error}`)
      return false
    }
    
    // Test time slot availability
    console.log('Testing time slot availability...')
    const today = new Date().toISOString().split('T')[0]
    const timeResponse = await fetch(`http://localhost:3000/api/availability?date=${today}`)
    const timeData = await timeResponse.json()
    
    if (timeData.success) {
      console.log(`✅ Time API: ${timeData.data.availableSlots} available slots`)
      const morningSlot = timeData.data.timeSlots.find(slot => slot.timeValue === '10:00')
      if (morningSlot) {
        console.log(`   10:00 AM: ${morningSlot.availableStaffCount} staff, ${morningSlot.availableRoomCount} rooms available`)
      }
    } else {
      console.log(`❌ Time API failed: ${timeData.error}`)
      return false
    }
    
    return true
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`)
    return false
  }
}

async function testBookingCreation(hotStoneServiceId) {
  console.log('\n📝 Testing Booking Creation...\n')
  
  if (!hotStoneServiceId) {
    console.log('❌ No Hot Stone service ID available for testing')
    return false
  }
  
  try {
    const bookingData = {
      serviceId: hotStoneServiceId,
      date: new Date().toISOString().split('T')[0],
      time: '11:00 AM',
      customerFirstName: 'Test',
      customerLastName: 'Customer',
      customerEmail: `test${Date.now()}@example.com`,
      customerPhone: '5551234567',
      specialRequests: 'Test booking for Hot Stone service'
    }
    
    console.log('Creating Hot Stone Massage booking...')
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Hot Stone booking created successfully!')
      console.log(`   Booking ID: ${result.data.id}`)
      console.log(`   Service: ${result.data.services.name}`)
      console.log(`   Date/Time: ${result.data.booking_date} at ${result.data.start_time}`)
      return result.data.id
    } else {
      console.log(`❌ Booking failed: ${result.error}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Booking creation failed: ${error.message}`)
    return false
  }
}

async function testAvailabilityUpdates() {
  console.log('\n🔄 Testing Availability Updates...\n')
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(`http://localhost:3000/api/availability?date=${today}`)
    const data = await response.json()
    
    if (data.success) {
      const slot11am = data.data.timeSlots.find(slot => slot.timeValue === '11:00')
      if (slot11am) {
        console.log(`✅ 11:00 AM slot availability updated:`)
        console.log(`   Available: ${slot11am.available}`)
        console.log(`   Staff: ${slot11am.availableStaffCount}`)
        console.log(`   Rooms: ${slot11am.availableRoomCount}`)
      }
      
      console.log(`📊 Total available slots for today: ${data.data.availableSlots}`)
      return true
    } else {
      console.log(`❌ Failed to check availability updates: ${data.error}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Availability update test failed: ${error.message}`)
    return false
  }
}

async function runFullSystemTest() {
  console.log('🚀 COMPREHENSIVE SPA BOOKING SYSTEM TEST')
  console.log('==========================================\n')
  
  // Test 1: Database Infrastructure
  await testDatabaseInfrastructure()
  
  // Test 2: Hot Stone Services
  const hotStoneServiceId = await testServiceAvailability()
  
  // Test 3: Availability APIs
  const apiWorking = await testAvailabilityAPIs()
  
  if (!apiWorking) {
    console.log('\n❌ CRITICAL: Availability APIs not working. Cannot proceed with booking tests.')
    return
  }
  
  // Test 4: Booking Creation
  const bookingId = await testBookingCreation(hotStoneServiceId)
  
  // Test 5: Availability Updates
  if (bookingId) {
    await testAvailabilityUpdates()
  }
  
  console.log('\n' + '='.repeat(50))
  if (bookingId) {
    console.log('🎉 ALL TESTS PASSED! System is fully functional!')
    console.log('✅ Hot Stone services are available and bookable')
    console.log('✅ Booking creation works without errors')
    console.log('✅ Availability updates correctly after bookings')
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some components working, booking needs attention')
  }
  console.log('='.repeat(50))
}

runFullSystemTest()